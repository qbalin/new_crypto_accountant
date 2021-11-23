import Address from '../addresses/address';

class AtomicTransaction {
  readonly createdAt: Date;

  readonly action: string;

  readonly currency: string;

  readonly from: Address;

  readonly to: Address;

  readonly bundleId: string;

  readonly amount: number;

  constructor({
    createdAt, action, currency, from, to, bundleId, amount,
  }: {
    createdAt: Date,
    action: string,
    currency: string,
    from: Address,
    to: Address,
    bundleId: string,
    amount: number,
  }) {
    this.createdAt = createdAt;
    this.action = action;
    this.currency = currency;
    this.bundleId = bundleId;
    this.amount = amount;
    this.to = to;
    this.from = from;
  }

  equal(other: AtomicTransaction) {
    return this.createdAt === other.createdAt
    && this.action === other.action
    && this.currency === other.currency
    && this.bundleId === other.bundleId
    && this.amount === other.amount
    // toString can be removed once addesses are singleton instances
    && this.to.toString() === other.to.toString()
    && this.from.toString() === other.from.toString();
  }

  toJson() {
    return {
      createdAt: this.createdAt,
      action: this.action,
      currency: this.currency,
      bundleId: this.bundleId,
      amount: this.amount,
      to: this.to.toString(),
      from: this.from.toString(),
    };
  }
}

export default AtomicTransaction;
