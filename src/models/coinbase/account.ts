/* eslint-disable camelcase */
interface Attributes {
  readonly id: string,
  readonly currency: string,
  readonly balance: string,
  readonly hold: string,
  readonly available: string,
  readonly profile_id: string,
  readonly trading_enabled: boolean,
}

class Account {
  private readonly attributes: Attributes;

  constructor({ attributes } : { attributes: Record<string, any> }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'currency', 'balance', 'hold', 'available', 'profile_id', 'trading_enabled']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.attributes = attributes as Attributes;
  }

  get id() {
    return this.attributes.id;
  }

  get currency() {
    return this.attributes.currency;
  }

  toJson() {
    return this.attributes;
  }
}

export default Account;
