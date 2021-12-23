/* eslint-disable max-classes-per-file */
import Address from '../addresses/address';
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

// class CurrencyAmount {
//   readonly currency: Currency;

//   readonly amount: number;

//   constructor({ amount, currency } : { amount: number, currency: Currency }) {
//     this.amount = amount;
//     this.currency = currency;
//   }
// }

// class TrackingEntry {
//   readonly createdAt: Date;

//   readonly transactionBundle: TransactionBundle;

//   constructor({ createdAt, transactionBundle } :
//     { createdAt: Date, transactionBundle: TransactionBundle}) {
//     this.createdAt = createdAt;
//     this.transactionBundle = transactionBundle;
//   }
// }

// class TrackingEntries {
//   readonly type: string;

//   constructor({ type } : { type: string }) {
//     this.type = type;
//   }
// }

// class TransactionSummary {
//   private amountIn: CurrencyAmount | undefined;

//   private amountOut: CurrencyAmount | undefined;

//   private cost: CurrencyAmount | undefined;

//   private fee: CurrencyAmount | undefined;

//   private trackingEntries: TrackingEntries | undefined;

//   private benefit: CurrencyAmount | undefined;

//   type: string;

//   constructor({
//     amountIn, amountOut, cost, fee, trackingEntries, benefit, type,
//   } : {
//     amountIn?: CurrencyAmount,
//     amountOut?: CurrencyAmount,
//     cost?: CurrencyAmount,
//     fee?: CurrencyAmount,
//     trackingEntries?: TrackingEntries,
//     benefit?: CurrencyAmount,
//     type: string
//   }) {
//     this.amountIn = amountIn;
//     this.amountOut = amountOut;
//     this.cost = cost;
//     this.fee = fee;
//     this.trackingEntries = trackingEntries;
//     this.benefit = benefit;
//     this.type = type;
//   }
// }

type TransferToSelfSummary = {
  timestamp: Date,
  currency: Currency,
  amount: number,
  from: Address,
  to: Address,
  feeAmount: number,
  feeCurrency: Currency,
  feeDestructionHistory: any[],
  transactionIds: string[],
}

type BuySummary = {
  timestamp: Date,
  currency: Currency,
  amount: number,
  fiatAmount: number,
  fiatCurrency: Currency,
  transactionIds: string[],
  to: Address,
  feeAmount: number,
  feeCurrency: Currency,
  feeConsumptionHistory: any[],
}

type SellSummary = {
  timestamp: Date,
  currency: Currency,
  amount: number,
  fiatAmount: number,
  fiatCurrency: Currency,
  transactionIds: string[],
  from: Address,
  feeAmount: number,
  feeCurrency: Currency,
  feeConsumptionHistory: any[],
  consumptions: any[],
  benefit: number,
}

type SwapSummary = {
  timestamp: Date,
  currencyOut: Currency,
  amountOut: number,
  currencyIn: Currency,
  amountIn: number,
  transactionIds: string[],
  from: Address,
  to: Address,
  feeAmount: number,
  feeCurrency: Currency,
  feeConsumptionHistory: any[],
  consumptions: any[],
  benefit: number,
}

type GetFreeSummary = {
  timestamp: Date,
  gain: {
    currency: Currency,
    amount: number
  }[],
  transactionIds: string[],
  to: Address,
  benefit: number,
  feeDestructionHistory: any[],
}

class TransactionBundle {
  readonly atomicTransactions: AtomicTransaction[];

  readonly action: BundleAction;

  readonly status: BundleStatus;

  readonly id: string;

  private privateNonFeeTransactions: null | AtomicTransaction[];

  private privateSynthetizable: null | boolean;

  readonly notes: string[];

  constructor({
    atomicTransactions, action, status, id, notes = [],
  } :
  {
    atomicTransactions: AtomicTransaction[],
    action: BundleAction,
    status: BundleStatus,
    id: string,
    notes?: string[]
  }) {
    this.status = status;
    this.atomicTransactions = atomicTransactions;
    this.action = action;
    this.id = id;
    this.notes = notes;
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

  get timestamp() {
    return new Date(Math.min(...this.atomicTransactions.map((at) => +at.createdAt)));
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

  get transactionIds() {
    return Array.from(new Set(this.atomicTransactions.map((a) => a.bundleId)));
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

      if (this.action === BundleAction.transferToSelf) {
        if (outboundAmounts.length > 1 || inboundAmounts.length > 1) {
          throw new Error(`Unexpected transfer with more than one inbound or outbound transactions. Offending bundle: ${JSON.stringify(this, null, 2)}. Inbound: ${JSON.stringify(inboundAmounts, null, 2)}. Outbound: ${JSON.stringify(outboundAmounts, null, 2)}`);
        }
        const outboundAmount = outboundAmounts[0];
        const inboundAmount = inboundAmounts[0];
        if (!outboundAmount || !inboundAmount) {
          throw new Error(`Transfer to self missing and inbound and / or outbound transaction. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }
        if (inboundAmount.currency !== outboundAmount.currency) {
          throw new Error(`A transfer to self should have an outbound and an inbound transaction for the same currency. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }
        if (
          Math.abs(inboundAmount.amount - outboundAmount.amount)
          / ((inboundAmount.amount + outboundAmount.amount) / 2) > 1e-6
        ) {
          throw new Error(`A transfer to self should bear the same inbound and outbound amount. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }
        const { currency } = inboundAmount;
        const amount = (inboundAmount.amount + outboundAmount.amount) / 2;

        if (fee) {
        // Treat fee as disposal (less advantageous). Taxable!
        // masterCostBasisTracker.consume({ currency: fee.currency, amount: fee.amount })

          // Treat fee as disparition (increases cost basis, more advantageous). Non taxable:
          const destructions = masterCostBasisTracker
            .destroy({ currency: fee.currency.ticker, amount: fee.amount });

          const from = this.nonFeeTransactions.find((t) => t.from.controlled)?.from;
          const to = this.nonFeeTransactions.find((t) => t.to.controlled)?.to;
          if (!from || !to) {
            throw new Error(`A transfer to self must have at least one fromControlled address and one toControlled address. Offending bundle: ${JSON.stringify(this, null, 2)}`);
          }

          return {
            timestamp: this.timestamp,
            currency,
            amount,
            from,
            to,
            feeAmount: fee.amount,
            feeCurrency: fee.currency,
            feeDestructionHistory: destructions,
            transactionIds: this.transactionIds,
          } as TransferToSelfSummary;
        }

        return null;
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
          throw new Error(`Trades are the sale, purchase or swap of crypto currencies. This trade seems to be between two fiat currencies. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }

        const feeCost = fee ? await fee.getCost() : 0;
        let feeConsumptions : any[] = [];

        if (outboundAmount.currency.isFiat) {
          // Purchase of cryptos
          masterCostBasisTracker.accrue({
            currency: inboundAmount.currency.ticker,
            entry: {
              amount: inboundAmount.amount,
              price: (outboundAmount.amount + feeCost) / inboundAmount.amount,
              transactionBundle: this,
            },
          });

          // We should consume fees always after an accrual has been registered: we can consider
          // that the currency accrued can be used to pay for the fees.
          if (fee && !fee.currency.isFiat) {
            // If you paid a fee of 0.1 ETH acquired at $100 for a trade USDC <> CEL on uniswap,
            // and at the time of the trade these 0.1 ETH are worth $200, these
            // $200 count towards your cost basis.
            // These 0.1 ETH were initially acquired as a purchase of 1ETH for $1000. You are
            // now left with 0.9 ETH at a cost basis of $900.
            // This is why the fee amount must be a consumption of cost basis, not a destruction.
            feeConsumptions = masterCostBasisTracker
              .consume({ currency: fee.currency.ticker, amount: fee.amount });
          }

          const to = this.atomicTransactions.find((at) => at.to.controlled)?.to;
          if (!to) {
            throw new Error(`A Buy transaction should have a currency sent to a toControlled address. Offending bundle: ${JSON.stringify(this, null, 2)}`);
          }

          return {
            timestamp: this.timestamp,
            currency: inboundAmount.currency,
            amount: inboundAmount.amount,
            fiatAmount: outboundAmount.amount,
            fiatCurrency: outboundAmount.currency,
            to,
            feeAmount: fee?.amount || 0,
            feeCurrency: fee?.currency || Currency.getInstance({ ticker: 'USD' }),
            transactionIds: this.transactionIds,
            feeConsumptionHistory: feeConsumptions,
          } as BuySummary;
        } if (inboundAmount.currency.isFiat) {
        // Sale of cryptos
          const consumptions = masterCostBasisTracker.consume({
            currency: outboundAmount.currency.ticker,
            amount: outboundAmount.amount,
          });

          // We should consume fees always after an accrual has been registered: we can consider
          // that the currency accrued can be used to pay for the fees.
          if (fee && !fee.currency.isFiat) {
            // If you paid a fee of 0.1 ETH acquired at $100 for a trade USDC <> CEL on uniswap,
            // and at the time of the trade these 0.1 ETH are worth $200, these
            // $200 count towards your cost basis.
            // These 0.1 ETH were initially acquired as a purchase of 1ETH for $1000. You are
            // now left with 0.9 ETH at a cost basis of $900.
            // This is why the fee amount must be a consumption of cost basis, not a destruction.
            feeConsumptions = masterCostBasisTracker
              .consume({ currency: fee.currency.ticker, amount: fee.amount });
          }

          const from = this.atomicTransactions.find((at) => at.from.controlled)?.from;
          if (!from) {
            throw new Error(`A Sell transaction should have a currency sent from a fromControlled address. Offending bundle: ${JSON.stringify(this, null, 2)}`);
          }

          let cost = 0;
          for (let i = 0; i < consumptions.length; i += 1) {
            const consumption = consumptions[i];
            cost += consumption.amount * consumption.price;
          }

          return {
            timestamp: this.timestamp,
            currency: outboundAmount.currency,
            amount: outboundAmount.amount,
            fiatAmount: inboundAmount.amount,
            fiatCurrency: inboundAmount.currency,
            transactionIds: this.transactionIds,
            from,
            feeAmount: fee?.amount || 0,
            feeCurrency: fee?.currency || Currency.getInstance({ ticker: 'USD' }),
            feeConsumptionHistory: feeConsumptions,
            consumptions,
            benefit: inboundAmount.amount - cost - feeCost,
          } as SellSummary;
        }
        // Swap a crypto for another
        const from = this.nonFeeTransactions.find((at) => at.from.controlled)?.from;
        const to = this.nonFeeTransactions.find((at) => at.to.controlled)?.to;
        if (!to || !from) {
          throw new Error(`A crypto swap should result in sending a crypto from a controlled address and receiving some to a controlled address. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }

        const inboundPrice = await inboundAmount.currency.getPrice({ at: this.timestamp });

        // The cost of the fee should not be included in the cost basis of the acquired coin:
        // the cost will be discounted from the benefits of the "sale" of the coin that is being
        // disposed. If we discount it from the benefit AND include it in the cost basis of the
        // acquired coin, we're lowering our benefits twice, thus being taxed less in an unfair way.
        // We can do either, but not both. Chosing here to count the loss due to the fee in the
        // disposal as it immediately causes a reduction in taxes, vs a deferred one.
        masterCostBasisTracker.accrue({
          currency: inboundAmount.currency.ticker,
          entry: {
            amount: inboundAmount.amount,
            price: inboundPrice,
            transactionBundle: this,
          },
        });
        const consumptions = masterCostBasisTracker.consume({
          currency: outboundAmount.currency.ticker,
          amount: outboundAmount.amount,
        });
        let cost = 0;
        for (let i = 0; i < consumptions.length; i += 1) {
          const consumption = consumptions[i];
          cost += consumption.amount * consumption.price;
        }

        // We should consume fees always after an accrual has been registered: we can consider
        // that the currency accrued can be used to pay for the fees.
        if (fee && !fee.currency.isFiat) {
          // If you paid a fee of 0.1 ETH acquired at $100 for a trade USDC <> CEL on uniswap,
          // and at the time of the trade these 0.1 ETH are worth $200, these
          // $200 count towards your cost basis.
          // These 0.1 ETH were initially acquired as a purchase of 1ETH for $1000. You are
          // now left with 0.9 ETH at a cost basis of $900.
          // This is why the fee amount must be a consumption of cost basis, not a destruction.
          feeConsumptions = masterCostBasisTracker
            .consume({ currency: fee.currency.ticker, amount: fee.amount });
        }

        return {
          timestamp: this.timestamp,
          currencyOut: outboundAmount.currency,
          amountOut: outboundAmount.amount,
          currencyIn: inboundAmount.currency,
          amountIn: inboundAmount.amount,
          transactionIds: this.transactionIds,
          from,
          to,
          feeAmount: fee?.amount || 0,
          feeCurrency: fee?.currency || Currency.getInstance({ ticker: 'USD' }),
          feeConsumptionHistory: feeConsumptions,
          consumptions,
          // inboundPrice * inboundAmount.amount == outboundPrice * outboundAmount.amount
          benefit: inboundPrice * inboundAmount.amount - cost - feeCost,
        } as SwapSummary;
      }

      if (this.action === BundleAction.getFree) {
        if (outboundAmounts.length > 0) {
          throw new Error(`A getFree action should not have any outbound amounts. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }
        const to = this.nonFeeTransactions.find((at) => at.to.controlled)?.to;
        if (!to) {
          throw new Error(`A getFree transaction should result in receiving some currencies to a controlled address. Offending bundle: ${JSON.stringify(this, null, 2)}`);
        }
        let feeCost = 0;
        let feeDestructionHistory : any[] = [];
        if (fee) {
          feeCost = await fee.getCost();
          feeDestructionHistory = masterCostBasisTracker
            .destroy({ currency: fee.currency.ticker, amount: fee.amount });
        }
        let benefit = 0;
        for (let i = 0; i < inboundAmounts.length; i += 1) {
          const inboundAmount = inboundAmounts[i];
          masterCostBasisTracker.accrue({
            currency: inboundAmount.currency.ticker,
            entry: {
              amount: inboundAmount.amount,
              price: 0,
              transactionBundle: this,
            },
          });
          // eslint-disable-next-line no-await-in-loop
          benefit += await (inboundAmount.currency.getPrice({ at: this.timestamp }))
           * inboundAmount.amount;
        }

        return {
          timestamp: this.timestamp,
          gain: inboundAmounts.map((ia) => ({ amount: ia.amount, currency: ia.currency })),
          transactionIds: this.transactionIds,
          benefit: benefit - feeCost,
          to,
          feeDestructionHistory,
        } as GetFreeSummary;
      }
      return null;
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
