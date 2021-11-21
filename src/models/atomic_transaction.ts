import Address from '../addresses/address';

class AtomicTransaction {
  readonly createdAt: Date;

  readonly action: string;

  readonly currency: string;

  readonly from: Address;

  readonly to: Address;

  readonly transactionHash?: string;

  readonly amount: number;

  constructor({
    createdAt, action, currency, from, to, transactionHash, amount,
  }: {
    createdAt: Date,
    action: string,
    currency: string,
    from: Address,
    to: Address,
    transactionHash?: string,
    amount: number,
  }) {
    this.createdAt = createdAt;
    this.action = action;
    this.currency = currency;
    this.transactionHash = transactionHash;
    this.amount = amount;
    this.to = to;
    this.from = from;
  }

  toJson() {
    return {
      createdAt: this.createdAt,
      action: this.action,
      currency: this.currency,
      transactionHash: this.transactionHash,
      amount: this.amount,
      to: this.to.toString(),
      from: this.from.toString(),
    };
  }
}

export default AtomicTransaction;
