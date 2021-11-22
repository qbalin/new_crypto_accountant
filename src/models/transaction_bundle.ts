import AtomicTransaction from './atomic_transaction';

export enum BundleStatus {
  complete = 'complete',
  incomplete = 'incomplete'
}

class TransactionBundle {
  readonly atomicTransactions: AtomicTransaction[];

  private readonly action: string;

  readonly status: string;

  constructor({ atomicTransactions, action, status } :
    { atomicTransactions: AtomicTransaction[], action: string, status: BundleStatus }) {
    this.status = status;
    this.atomicTransactions = atomicTransactions;
    this.action = action;
  }
}

export default TransactionBundle;
