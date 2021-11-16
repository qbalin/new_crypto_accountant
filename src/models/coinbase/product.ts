/* eslint-disable camelcase */
interface Attributes {
  readonly id: string,
  readonly base_currency: string,
  readonly quote_currency: string,
  readonly base_min_size: string,
  readonly base_max_size: string,
  readonly quote_increment: string,
  readonly base_increment: string,
  readonly display_name: string,
  readonly min_market_funds: string,
  readonly max_market_funds: string,
  readonly margin_enabled: boolean,
  readonly fx_stablecoin: boolean,
  readonly max_slippage_percentage: string,
  readonly post_only: boolean,
  readonly limit_only: boolean,
  readonly cancel_only: boolean,
  readonly trading_disabled: boolean,
  readonly status: string,
  readonly status_message: string,
  readonly auction_mode: boolean,
}

class Product {
  private readonly attributes: Attributes;

  constructor({ attributes } : { attributes: Record<string, any> }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'base_currency', 'quote_currency', 'base_min_size', 'base_max_size', 'quote_increment', 'base_increment', 'display_name', 'min_market_funds', 'max_market_funds', 'margin_enabled', 'fx_stablecoin', 'max_slippage_percentage', 'post_only', 'limit_only', 'cancel_only', 'trading_disabled', 'status', 'status_message', 'auction_mode']);
    if (attributesPassed.size + attributesRequired.size
      !== new Set([Array.from(attributesPassed), Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.attributes = attributes as Attributes;
  }

  get id() {
    return this.attributes.id;
  }

  toJson() {
    return this.attributes;
  }
}

export default Product;
