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
  readonly side: string,
  readonly settled: boolean,
  readonly usd_volume: string,
}

class Fill {
  private readonly attributes: Attributes;

  constructor({ attributes } : { attributes: Record<string, any> }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['created_at', 'trade_id', 'product_id', 'order_id', 'user_id', 'profile_id', 'liquidity', 'price', 'size', 'fee', 'side', 'settled', 'usd_volume']);
    if (attributesPassed.size + attributesRequired.size
      !== new Set([Array.from(attributesPassed), Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.attributes = attributes as Attributes;
  }

  get created_at() {
    return new Date(this.attributes.created_at);
  }

  get trade_id() {
    return this.attributes.trade_id;
  }

  get price() {
    return parseInt(this.attributes.price, 10);
  }

  get size() {
    return parseInt(this.attributes.size, 10);
  }

  get fee() {
    return parseInt(this.attributes.fee, 10);
  }

  toJson() {
    return this.attributes;
  }
}

export default Fill;
