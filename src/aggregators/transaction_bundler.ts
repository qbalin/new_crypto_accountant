import AtomicTransaction from '../models/atomic_transaction';

class TransactionBundler {
  readonly atomicTransactions: AtomicTransaction[];

  constructor({ atomicTransactions } : { atomicTransactions: AtomicTransaction[]}) {
    this.atomicTransactions = atomicTransactions;
  }

  makeBundles() {
    const atomicTransactionsGroupedByBundleId = this.atomicTransactions
      .reduce((groups: Record<string, AtomicTransaction[]>, transaction) => {
        if (!transaction.transactionHash) {
          throw new Error(`Cannot bundle transaction without a bundleId ${JSON.stringify(transaction.toJson())}`);
        }
        if (!groups[transaction.transactionHash]) {
          // eslint-disable-next-line no-param-reassign
          groups[transaction.transactionHash] = [];
        }
        groups[transaction.transactionHash].push(transaction);
        return groups;
      }, {});
    console.log(atomicTransactionsGroupedByBundleId);
  }
}

export default TransactionBundler;
