import PlatformAddress from '../../addresses/platform_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedPlatform } from '../../config_types';
import AtomicTransaction, { PAY_FEE } from '../atomic_transaction';
import Currency from '../currency';
import { ToAtomicTransactionable, TransactionBundlable } from '../model_types';
import TransactionBundle, { BundleAction, BundleStatus } from '../transaction_bundle';

/* eslint-disable camelcase */
interface Attributes {
  id: string,
  currency: string,
  amount: string,
  fee: string,
  balance: string,
  accountType: 'MAIN' | 'TRADE' | 'MARGIN' | 'CONTRACT',
  bizType: 'Withdrawal' | 'Transfer' | 'Exchange' | 'Deposit' | 'Rewards' | 'Staking' | 'Convert to KCS' | 'Soft Staking Profits' | 'Staking Profits' | 'Redemption',
  direction: 'out' | 'in',
  createdAt: number,
  context: string | null,
}

class LedgerEntry implements ToAtomicTransactionable, TransactionBundlable {
  private readonly attributes: Attributes;

  private readonly accountNickname: string;

  private atomicTransactions: AtomicTransaction[] | null

  constructor({ attributes, accountNickname } :
    { attributes: Record<string, any>, accountNickname: string }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'currency', 'amount', 'fee', 'balance', 'accountType', 'bizType', 'direction', 'createdAt', 'context']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.atomicTransactions = null;
    this.accountNickname = accountNickname;
    this.attributes = attributes as Attributes;
  }

  get id() {
    return this.attributes.id;
  }

  get amount() {
    const parsedAmount = parseFloat(this.attributes.amount);
    if (parsedAmount === 0) {
      throw new Error(`Unexpected amount of 0 for Kucoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    return parsedAmount;
  }

  get fee() {
    return parseFloat(this.attributes.fee);
  }

  get createdAt() {
    return new Date(this.attributes.createdAt);
  }

  get bundleId() {
    if (this.bizType === 'Exchange') {
      if (!this.context?.tradeId) {
        throw new Error(`A ledger entry with bizType "Exchange" must have a tradeId: ${JSON.stringify(this, null, 2)}`);
      }
      return `${SupportedPlatform.KuCoin}-trade_id-${this.context.tradeId}`;
    }
    if (this.bizType === 'Convert to KCS') {
      if (!this.context?.smallCurrencyExchangeId) {
        throw new Error(`A ledger entry with bizType "Convert to KCS" must have a smallCurrencyExchangeId: ${JSON.stringify(this, null, 2)}`);
      }
      return `${SupportedPlatform.KuCoin}-small_currency_exchange_id-${this.context.smallCurrencyExchangeId}`;
    }

    return `${SupportedPlatform.KuCoin}-ledger_entry_id-${this.id}`;
  }

  get bizType() {
    return this.attributes.bizType;
  }

  get context() {
    return (this.attributes.context && JSON.parse(this.attributes.context)) || null;
  }

  get currency() {
    return this.attributes.currency;
  }

  get direction() {
    return this.attributes.direction;
  }

  transactionBundle() {
    let action;
    let status;
    switch (this.bizType) {
      case 'Exchange':
      case 'Convert to KCS':
        action = BundleAction.trade;
        status = BundleStatus.incomplete;
        break;
      case 'Soft Staking Profits':
      case 'Staking Profits':
      case 'Rewards':
        action = BundleAction.getFree;
        status = BundleStatus.complete;
        break;
      case 'Deposit':
      case 'Withdrawal':
        action = BundleAction.transfer;
        status = BundleStatus.incomplete;
        break;
      case 'Redemption':
      case 'Staking':
      case 'Transfer':
        action = BundleAction.noOp;
        status = BundleStatus.complete;
        break;
      default:
        // There are a lot more: https://docs.kucoin.com/#biztype-description
        throw new Error(`Unexpected bizType for KuCoin lendger entry: ${JSON.stringify(this, null, 2)}`);
    }

    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions(),
      action,
      status,
      id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    switch (this.bizType) {
      case 'Convert to KCS':
        this.atomicTransactions = this.convertToKCS();
        break;
      case 'Deposit':
        this.atomicTransactions = this.deposit();
        break;
      case 'Exchange':
        this.atomicTransactions = this.exchange();
        break;
      case 'Redemption':
        this.atomicTransactions = this.redemption();
        break;
      case 'Rewards':
        this.atomicTransactions = this.rewards();
        break;
      case 'Soft Staking Profits':
        this.atomicTransactions = this.softStakingProfits();
        break;
      case 'Staking':
        this.atomicTransactions = this.staking();
        break;
      case 'Staking Profits':
        this.atomicTransactions = this.stakingProfits();
        break;
      case 'Transfer':
        this.atomicTransactions = this.transfer();
        break;
      case 'Withdrawal':
        this.atomicTransactions = this.withdrawal();
        break;
      default:
        // There are a lot more: https://docs.kucoin.com/#biztype-description
        throw new Error(`Unexpected bizType for KuCoin lendger entry: ${JSON.stringify(this, null, 2)}`);
    }

    return this.atomicTransactions;
  }

  exchange() {
    const transactions = [];
    if (!this.context.tradeId) {
      throw new Error(`Kucoin Ledger entry with bizType "Exchange" is missing a tradeId: ${JSON.stringify(this, null, 2)}`);
    }
    if (this.fee > 0) {
      transactions.push(
        new AtomicTransaction({
          createdAt: this.createdAt,
          action: PAY_FEE,
          currency: Currency.getInstance({ ticker: this.currency }),
          from: PlatformAddress.getInstance({
            nickname: this.accountNickname,
            platform: SupportedPlatform.KuCoin,
          }),
          to: VoidAddress.getInstance({ note: 'Kucoin' }),
          amount: this.amount,
          bundleId: this.bundleId,
        }),
      );
    }

    let to;
    let from;
    if (this.direction === 'in') {
      from = VoidAddress.getInstance({ note: 'Kucoin' });
      to = PlatformAddress.getInstance({
        nickname: this.accountNickname,
        platform: SupportedPlatform.KuCoin,
      });
    } else {
      to = VoidAddress.getInstance({ note: 'Kucoin' });
      from = PlatformAddress.getInstance({
        nickname: this.accountNickname,
        platform: SupportedPlatform.KuCoin,
      });
    }

    transactions.push(
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '----------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from,
        to,
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    );

    return transactions;
  }

  redemption() {
    // This is getting back your coins after staking. The amount redeemed cannot exceed the amount
    // staked, so it bears no benefit: rewards are logged as a different bizType
    if (this.direction === 'out') {
      throw new Error(`Redemptions are not supposed to flow out of an account, only in. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    if (this.fee > 0) {
      throw new Error(`Redemptions are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }

    return [];
  }

  rewards() {
    if (this.direction === 'out') {
      throw new Error(`Rewards are not supposed to flow out of an account, only in. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    if (this.fee > 0) {
      throw new Error(`Rewards are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '----------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: VoidAddress.getInstance({ note: 'Kucoin' }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.KuCoin,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }

  softStakingProfits() {
    if (this.direction === 'out') {
      throw new Error(`Soft Staking Profits are not supposed to flow out of an account, only in. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    if (this.fee > 0) {
      throw new Error(`Soft Staking Profits are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '----------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: VoidAddress.getInstance({ note: 'Kucoin' }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.KuCoin,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }

  staking() {
    // This is locking your funds to get rewards. Funds do not really leave your custody.
    if (this.direction === 'in') {
      throw new Error(`Staking amounts are not supposed to flow in an account, only out. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    if (this.fee > 0) {
      throw new Error(`Staking are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    return [];
  }

  stakingProfits() {
    if (this.direction === 'out') {
      throw new Error(`Staking Profits are not supposed to flow out of an account, only in. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    if (this.fee > 0) {
      throw new Error(`Staking Profits are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '----------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: VoidAddress.getInstance({ note: 'Kucoin' }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.KuCoin,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }

  // eslint-disable-next-line class-methods-use-this
  transfer() {
    // These are inner transfers to KuCoin accounts: POOL > TRADE, TRADE > MAIN, etc...

    if (this.fee > 0) {
      throw new Error(`Transfers are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }

    return [];
  }

  withdrawal() {
    if (this.direction === 'in') {
      throw new Error(`Withdrawals are not supposed to flow into an account, only out. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    const transactions = [];
    if (this.fee > 0) {
      transactions.push(
        new AtomicTransaction({
          createdAt: this.createdAt,
          action: PAY_FEE,
          currency: Currency.getInstance({ ticker: this.currency }),
          from: PlatformAddress.getInstance({
            nickname: this.accountNickname,
            platform: SupportedPlatform.KuCoin,
          }),
          to: VoidAddress.getInstance({ note: 'Kucoin' }),
          amount: this.amount,
          bundleId: this.bundleId,
        }),
      );
    }

    transactions.push(
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '--------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.KuCoin,
        }),
        to: VoidAddress.getInstance({ note: `Other ${this.currency} address` }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    );

    return transactions;
  }

  deposit() {
    if (this.direction === 'out') {
      throw new Error(`Deposits are not supposed to flow out of an account, only in. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    if (this.fee > 0) {
      throw new Error(`Deposits are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }

    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '--------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: VoidAddress.getInstance({ note: `Other ${this.currency} address` }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.KuCoin,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }

  convertToKCS() {
    if (this.fee > 0) {
      throw new Error(`Conversions to KCS are not supposed to have fees. KuCoin ledger entry: ${JSON.stringify(this, null, 2)}`);
    }
    let from;
    let to;
    if (this.direction === 'in') {
      from = VoidAddress.getInstance({ note: 'Kucoin' });
      to = PlatformAddress.getInstance({
        nickname: this.accountNickname,
        platform: SupportedPlatform.KuCoin,
      });
    } else {
      to = VoidAddress.getInstance({ note: 'Kucoin' });
      from = PlatformAddress.getInstance({
        nickname: this.accountNickname,
        platform: SupportedPlatform.KuCoin,
      });
    }
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '--------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from,
        to,
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }
}

export default LedgerEntry;
