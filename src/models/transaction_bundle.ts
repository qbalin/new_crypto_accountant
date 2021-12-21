import masterCostBasisTracker from '../taxes/master_cost_basis_tracker';
import AtomicTransaction from './atomic_transaction';
import Currency from './currency';

export enum BundleStatus {
  complete = 'complete',
  incomplete = 'incomplete'
}

export enum BundleAction {
  transfer = 'transfer',
  transferToSelf = 'transferToSelf',
  trade = 'trade',
  getFree = 'getFree',
  toBeDetermined = 'toBeDetermined',
  noOp = 'noOp',
  pureFeePayment = 'pureFeePayment',
}

class TransactionBundle {
  readonly atomicTransactions: AtomicTransaction[];

  readonly action: BundleAction;

  readonly status: BundleStatus;

  readonly id: string;

  private privateNonFeeTransactions: null | AtomicTransaction[];

  private privateSynthetizable: null | boolean;

  constructor({
    atomicTransactions, action, status, id,
  } :
  {
    atomicTransactions: AtomicTransaction[],
    action: BundleAction,
    status: BundleStatus,
    id: string
  }) {
    this.status = status;
    this.atomicTransactions = atomicTransactions;
    this.action = action;
    this.id = id;
    this.privateNonFeeTransactions = null;
    this.privateSynthetizable = null;
  }

  get isTrade() {
    return this.action === BundleAction.trade;
  }

  get isComplete() {
    return this.status === BundleStatus.complete;
  }

  get isPureFee() {
    return this.atomicTransactions.length === 1 && this.atomicTransactions[0].isFeePayment;
  }

  get fromControlled() {
    return this.atomicTransactions.some((transaction) => transaction.from.controlled);
  }

  get toControlled() {
    return this.atomicTransactions.some((transaction) => transaction.to.controlled);
  }

  get isEmpty() {
    return this.atomicTransactions.length === 0
    || this.atomicTransactions.every((t) => t.amount === 0);
  }

  get nonFeeTransactions() {
    this.privateNonFeeTransactions ||= this.atomicTransactions.filter((t) => !t.isFeePayment);
    return this.privateNonFeeTransactions;
  }

  get synthetizable() {
    if (this.privateSynthetizable !== null) {
      return this.privateSynthetizable;
    }
    if (this.nonFeeTransactions.length === 0) {
      this.privateSynthetizable = false;
      return this.privateSynthetizable;
    }
    this.privateSynthetizable = Object
      .values(this.nonFeeTransactions.reduce((memo, transaction) => {
        memo.from.add(transaction.from);
        memo.createdAt.add(transaction.createdAt.valueOf);
        memo.to.add(transaction.to);
        memo.currencies.add(transaction.currency);
        return memo;
      }, {
        currencies: new Set(), createdAt: new Set(), to: new Set(), from: new Set(),
      })).reduce((memo, set) => memo && set.size === 1, true as boolean);

    return this.privateSynthetizable;
  }

  get syntheticTransaction() {
    // This is the "main" transaction of an incomplete transfer bundle. Normally, this
    // would be the other transaction that is not a fee in the bundle, but UTXO transactions
    // are in fact represented by many transactions, which we intend to reduce to a single
    // one here.
    if (!this.synthetizable) {
      throw new Error(`To be aggregated in a single synthetic transaction, all transactions to, from, currency and createdAt must match. Offending bundle: ${JSON.stringify(this, null, 2)}`);
    }

    const {
      to, from, currency, createdAt, bundleId,
    } = this.nonFeeTransactions[0];

    return new AtomicTransaction({
      to,
      from,
      createdAt,
      currency,
      action: '--------',
      bundleId,
      amount: this.nonFeeTransactions.reduce((memo, transaction) => transaction.amount + memo, 0),
    });
  }

  get amountsOutPerCurrency() {
    return Object.entries(this.nonFeeTransactions
      .filter((t) => t.from.controlled)
      .reduce((memo, transaction) => {
        // eslint-disable-next-line no-param-reassign
        memo[transaction.currency.ticker] ||= 0;
        // eslint-disable-next-line no-param-reassign
        memo[transaction.currency.ticker] += transaction.amount;
        return memo;
      }, {} as Record<string, number>))
      .map(([ticker, amount]) => ({ currency: Currency.getInstance({ ticker }), amount }));
  }

  get amountsInPerCurrency() {
    return Object.entries(this.nonFeeTransactions
      .filter((t) => t.to.controlled)
      .reduce((memo, transaction) => {
        // eslint-disable-next-line no-param-reassign
        memo[transaction.currency.ticker] ||= 0;
        // eslint-disable-next-line no-param-reassign
        memo[transaction.currency.ticker] += transaction.amount;
        return memo;
      }, {} as Record<string, number>))
      .map(([ticker, amount]) => ({ currency: Currency.getInstance({ ticker }), amount }));
  }

  get feeTransaction() {
    const feeTransactions = this.atomicTransactions.filter((t) => t.isFeePayment);
    if (feeTransactions.some((t) => t.to.controlled)) {
      throw new Error(`Fees are never supposed to be received, only sent out. Offending bundle: ${JSON.stringify(this, null, 2)}`);
    }
    const outboundFeeTransactions = feeTransactions.filter((t) => t.from.controlled);
    if (outboundFeeTransactions.length > 1) {
      throw new Error(`There should only be one fee paid per bundle. Offending bundle: ${JSON.stringify(this, null, 2)}`);
    }

    return outboundFeeTransactions[0];
  }

  /** US implementation */
  async getTaxableEvents() {
    try {
      const outboundAmounts = this.amountsOutPerCurrency;
      const inboundAmounts = this.amountsInPerCurrency;
      const fee = this.feeTransaction;

      if (this.action === BundleAction.transfer) {
        if (outboundAmounts.length > 1 || inboundAmounts.length > 1) {
          throw new Error(`Unexpected transfer with more than one inbound or outbound transactions. Offending bundle: ${JSON.stringify(this, null, 2)}. Inbound: ${JSON.stringify(inboundAmounts, null, 2)}. Outbound: ${JSON.stringify(outboundAmounts, null, 2)}`);
        }
        const outboundAmount = outboundAmounts[0];
        const inboundAmount = inboundAmounts[0];
        if (outboundAmount && inboundAmount) {
          if (inboundAmount.currency !== outboundAmount.currency) {
            throw new Error(`A transfer should have an outbound and an inbound transaction for the same currency. Offending bundle: ${JSON.stringify(this, null, 2)}`);
          }
        } else if (outboundAmount) {
          // If there's only an outbound transaction, this can be:
          // - a gift
          // - a pure loss (sent to wrong address)
          // - a payment for services
          // In any case, there is a consumption
          masterCostBasisTracker.consume({
            currency: outboundAmount.currency.ticker,
            amount: outboundAmount.amount,
          });
        } else if (inboundAmount) {
          // This is free money in, i.e. at a cost basis of 0
          masterCostBasisTracker.accrue({
            currency: inboundAmount.currency.ticker,
            entry: {
              amount: inboundAmount.amount,
              price: 0,
            },
          });
        } else {
          throw new Error(`Transfer without any inbound not outbound transaction unexpected. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }

        if (fee) {
        // Treat fee as disposal (less advantageous). Taxable!
        // masterCostBasisTracker.consume({ currency: fee.currency, amount: fee.amount })

          // Treat fee as disparition (increases cost basis, more advantageous). Non taxable:
          masterCostBasisTracker.destroy({ currency: fee.currency.ticker, amount: fee.amount });
        }
        return {};
      }

      if (this.action === BundleAction.trade) {
        const outboundAmount = outboundAmounts[0];
        const inboundAmount = inboundAmounts[0];
        if (outboundAmounts.length > 1 || inboundAmounts.length > 1) {
          throw new Error(`Unexpected trade with more than one inbound or outbound transactions. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }
        if (inboundAmount.currency === outboundAmount.currency) {
          throw new Error(`A trade should have an outbound and an inbound transaction for different currencies. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }

        if (outboundAmount.currency.isFiat && inboundAmount.currency.isFiat) {
          throw new Error(`Trades are the sale, purchase or swap of crypto currencies. This trade seems to be between to fiat currencies. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }

        const feeCost = fee ? 0 : 0;// await fee.getCost();
        if (fee) {
          masterCostBasisTracker.destroy({ currency: fee.currency.ticker, amount: fee.amount });
        }

        if (outboundAmount.currency.isFiat) {
        // Purchase of cryptos
          masterCostBasisTracker.accrue({
            currency: inboundAmount.currency.ticker,
            entry: {
              amount: inboundAmount.amount,
              price: (outboundAmount.amount + feeCost) / inboundAmount.amount,
            },
          });
        } else if (inboundAmount.currency.isFiat) {
        // Sale of cryptos
          const basis = masterCostBasisTracker.consume({
            currency: outboundAmount.currency.ticker,
            amount: outboundAmount.amount,
          });

          return {
            benefit: inboundAmount.amount
          - basis.reduce((memo, value) => memo + value.amount * value.price, 0),
          };
        } else {
          const basis = masterCostBasisTracker.consume({
            currency: outboundAmount.currency.ticker,
            amount: outboundAmount.amount,
          });
          const currentCost = 0;// await outboundTransaction.getCost();

          masterCostBasisTracker.accrue({
            currency: inboundAmount.currency.ticker,
            entry: {
              amount: inboundAmount.amount,
              price: (currentCost + feeCost) / inboundAmount.amount,
            },
          });

          return {
            benefit: currentCost
          - basis.reduce((memo, value) => memo + value.amount * value.price, 0),
          };
        }
      }

      // Swap ETH against BTC (ETH in, BTC out)

      // ETH in
      // const feePrice = fee.toFiat();
      // const price = getPriceOf(t.currency, t.amount);
      // update(t.currency, t.createdAt, t.amount, price + feePrice);

      // // BTC out
      // const costBasis = getCostBasis('BTC', amount);
      // remove(t.currency, t.createdAt, -t.amount);

      // // Proceed
      // (price - costBasis);

      // Buy ETH
      // const feePrice = fee.toFiat();
      // const price = dollarValueOfTrade
      // update(t.currency, t.createdAt, t.amount, price + feePrice);

      // Sell ETH
      // const feePrice = fee.toFiat();
      // const costBasis = getCostBasis('ETH', amount);
      // remove(t.currency, t.createdAt, -t.amount);
      // // Proceed
      // (price - costBasis);

      // {
      //   'eth': [
      //     {
      //       amount: 1,
      //       price: 1000,
      //     },
      //     {
      //       amount: 1,
      //       price: 2000,
      //     }
      //   ]
      // }
      return {};
    } catch (e) {
      console.log(`Erroring bundle: ${JSON.stringify(this, null, 2)}`);
      throw e;
    }
  }

  complete() {
    return new TransactionBundle({
      atomicTransactions: this.atomicTransactions,
      status: BundleStatus.complete,
      action: this.action,
      id: this.id,
    });
  }

  equal(other: TransactionBundle) {
    if (this.atomicTransactions.length !== other.atomicTransactions.length) {
      return false;
    }
    return this.atomicTransactions
      .every((transaction) => other.atomicTransactions.some((t) => transaction.equal(t)));
  }
}

export default TransactionBundle;
