import PlatformAddress from '../../addresses/platform_address';
import { SupportedPlatform } from '../../config_types';
import AtomicTransaction, { PAY_FEE } from '../atomic_transaction';
import VoidAddress from '../../addresses/void_address';
import TransactionBundle, { BundleAction, BundleStatus } from '../transaction_bundle';
import Currency from '../currency';

/* eslint-disable camelcase */
interface Attributes {
  readonly created_at: string,
  readonly trade_id: number,
  readonly product_id: string,
  readonly order_id: string,
  readonly user_id: string,
  readonly profile_id: string,
  readonly liquidity: string,
  readonly price: string,
  readonly size: string,
  readonly fee: string,
  readonly side: 'buy' | 'sell',
  readonly settled: boolean,
  readonly usd_volume: string,
}

class Fill {
  private readonly attributes: Attributes;

  private readonly quoteCurrency: string;

  private readonly baseCurrency: string;

  private readonly accountNickname: string;

  private atomicTransactions: AtomicTransaction[] | null;

  constructor({ attributes, accountNickname } :
    { attributes: Record<string, any>, accountNickname: string }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['created_at', 'trade_id', 'product_id', 'order_id', 'user_id', 'profile_id', 'liquidity', 'price', 'size', 'fee', 'side', 'settled', 'usd_volume']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      console.log(attributes);
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    const [baseCurrency, quoteCurrency] = attributes.product_id.split('-');
    this.baseCurrency = baseCurrency;
    this.quoteCurrency = quoteCurrency;

    this.atomicTransactions = null;
    this.accountNickname = accountNickname;
    this.attributes = attributes as Attributes;
  }

  get createdAt() {
    return new Date(this.attributes.created_at);
  }

  get tradeId() {
    return this.attributes.trade_id;
  }

  get price() {
    return parseFloat(this.attributes.price);
  }

  get size() {
    return parseFloat(this.attributes.size);
  }

  get fee() {
    return parseFloat(this.attributes.fee);
  }

  get settled() {
    return this.attributes.settled;
  }

  get side() {
    return this.attributes.side;
  }

  get bundleId() {
    return `${SupportedPlatform.Coinbase}-trade_id-${this.tradeId}`;
  }

  transactionBundle() {
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions().filter((t) => t.amount !== 0),
      action: BundleAction.trade,
      status: BundleStatus.complete,
      id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (!this.settled) {
      return [];
    }
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }
    if (!this.tradeId || !this.baseCurrency || !this.quoteCurrency) {
      throw new Error(`Cannot find trade id, base currency or quote currency: ${JSON.stringify(this)}`);
    }
    if (this.side !== 'buy' && this.side !== 'sell') {
      throw new Error(`Fill side unrecognized, should be one of ['buy', 'sell'] but was ${this.side} for fill ${JSON.stringify(this)}`);
    }
    this.atomicTransactions = this.side === 'buy' ? this.toBuyAtomicTransactions() : this.toSellAtomicTransactions();
    return this.atomicTransactions;
  }

  private toBuyAtomicTransactions() {
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency: Currency.getInstance({ ticker: this.baseCurrency }),
        from: VoidAddress.getInstance({ note: 'Coinbase Inc.' }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        amount: this.size,
        bundleId: this.bundleId,
      }),
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency: Currency.getInstance({ ticker: this.quoteCurrency }),
        from: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        to: VoidAddress.getInstance({ note: 'Coinbase Inc.' }),
        amount: this.size * this.price,
        bundleId: this.bundleId,
      }),
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: PAY_FEE,
        currency: Currency.getInstance({ ticker: this.quoteCurrency }),
        from: PlatformAddress.getInstance({
          platform: SupportedPlatform.Coinbase,
          nickname: this.accountNickname,
        }),
        to: VoidAddress.getInstance({ note: 'Coinbase Inc.' }),
        amount: this.fee,
        bundleId: this.bundleId,
      }),
    ];
  }

  private toSellAtomicTransactions() {
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency: Currency.getInstance({ ticker: this.baseCurrency }),
        from: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        to: VoidAddress.getInstance({ note: 'Coinbase Inc.' }),
        amount: this.size,
        bundleId: this.bundleId,
      }),
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency: Currency.getInstance({ ticker: this.quoteCurrency }),
        from: VoidAddress.getInstance({ note: 'Coinbase Inc.' }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        amount: this.size * this.price,
        bundleId: this.bundleId,
      }),
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: PAY_FEE,
        currency: Currency.getInstance({ ticker: this.quoteCurrency }),
        from: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        to: VoidAddress.getInstance({ note: 'Coinbase Inc.' }),
        amount: this.fee,
        bundleId: this.bundleId,
      }),
    ];
  }
}

export default Fill;
