import Address from '../addresses/address';
import Currency from './currency';

export const PAY_FEE = 'PAY_FEE';

class AtomicTransaction {
  readonly createdAt: Date;

  readonly action: string;

  readonly currency: Currency;

  readonly from: Address;

  readonly to: Address;

  readonly bundleId: string;

  readonly amount: number;

  constructor({
    createdAt, action, currency, from, to, bundleId, amount,
  }: {
    createdAt: Date,
    action: string,
    currency: Currency,
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
    return +this.createdAt === +other.createdAt
    && this.action === other.action
    && this.currency === other.currency
    && this.bundleId === other.bundleId
    && this.amount === other.amount
    // toString can be removed once addesses are singleton instances
    && this.to.toString() === other.to.toString()
    && this.from.toString() === other.from.toString();
  }

  get isFeePayment() {
    return this.action === PAY_FEE;
  }
}

export default AtomicTransaction;
