import { SupportedPlatform } from '../../config_types';
import AtomicTransaction from '../atomic_transaction';

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

  constructor({ attributes, accountNickname } :
    { attributes: Record<string, any>, accountNickname: string }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['created_at', 'trade_id', 'product_id', 'order_id', 'user_id', 'profile_id', 'liquidity', 'price', 'size', 'fee', 'side', 'settled', 'usd_volume']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    const [baseCurrency, quoteCurrency] = attributes.product_id.split('-');
    this.baseCurrency = baseCurrency;
    this.quoteCurrency = quoteCurrency;

    this.accountNickname = accountNickname;
    this.attributes = attributes as Attributes;
  }

  get created_at() {
    return new Date(this.attributes.created_at);
  }

  get trade_id() {
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

  toJson() {
    return this.attributes;
  }

  toAtomicTransactions() {
    if (!this.settled) {
      return [];
    }
    if (!this.trade_id || !this.baseCurrency || !this.quoteCurrency) {
      throw new Error(`Cannot find trade id, base currency or quote currency: ${JSON.stringify(this.toJson)}`);
    }
    if (this.side !== 'buy' && this.side !== 'sell') {
      throw new Error(`Fill side unrecognized, should be one of ['buy', 'sell'] but was ${this.side} for fill ${JSON.stringify(this.toJson)}`);
    }
    return this.side === 'buy' ? this.toBuyAtomicTransactions() : this.toSellAtomicTransactions();
  }

  private toBuyAtomicTransactions() {
    return [
      new AtomicTransaction({
        createdAt: this.created_at,
        action: '-----',
        currency: this.baseCurrency,
        from: 'Coinbase Inc',
        to: this.accountNickname,
        amount: this.size,
        transactionHash: 'hash',
        platform: SupportedPlatform.Coinbase,
      }),
      new AtomicTransaction({
        createdAt: this.created_at,
        action: '-----',
        currency: this.quoteCurrency,
        from: this.accountNickname,
        to: 'Coinbase Inc',
        amount: this.size * this.price,
        transactionHash: 'hash',
        platform: SupportedPlatform.Coinbase,
      }),
      new AtomicTransaction({
        createdAt: this.created_at,
        action: 'PAY_FEE',
        currency: this.quoteCurrency,
        from: this.accountNickname,
        to: 'Coinbase Inc',
        amount: this.fee,
        transactionHash: 'hash',
        platform: SupportedPlatform.Coinbase,
      }),
    ];
  }

  private toSellAtomicTransactions() {
    return [
      new AtomicTransaction({
        createdAt: this.created_at,
        action: '-----',
        currency: this.baseCurrency,
        from: this.accountNickname,
        to: 'Coinbase Inc',
        amount: this.size,
        transactionHash: 'hash',
        platform: SupportedPlatform.Coinbase,
      }),
      new AtomicTransaction({
        createdAt: this.created_at,
        action: '-----',
        currency: this.quoteCurrency,
        from: 'Coinbase Inc',
        to: this.accountNickname,
        amount: this.size * this.price,
        transactionHash: 'hash',
        platform: SupportedPlatform.Coinbase,
      }),
      new AtomicTransaction({
        createdAt: this.created_at,
        action: 'PAY_FEE',
        currency: this.quoteCurrency,
        from: this.accountNickname,
        to: 'Coinbase Inc',
        amount: this.fee,
        transactionHash: 'hash',
        platform: SupportedPlatform.Coinbase,
      }),
    ];
  }
}

export default Fill;
