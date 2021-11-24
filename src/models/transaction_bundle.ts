import AtomicTransaction from './atomic_transaction';

export enum BundleStatus {
  complete = 'complete',
  incomplete = 'incomplete'
}

class TransactionBundle {
  readonly atomicTransactions: AtomicTransaction[];

  readonly action: string;

  readonly status: string;

  readonly id: string;

  constructor({
    atomicTransactions, action, status, id,
  } :
    { atomicTransactions: AtomicTransaction[], action: string, status: BundleStatus, id: string }) {
    this.status = status;
    this.atomicTransactions = atomicTransactions;
    this.action = action;
    this.id = id;
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
