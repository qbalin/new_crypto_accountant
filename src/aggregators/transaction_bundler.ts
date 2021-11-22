import AtomicTransaction from '../models/atomic_transaction';

class TransactionBundler {
  readonly atomicTransactions: AtomicTransaction[];

  constructor({ atomicTransactions } : { atomicTransactions: AtomicTransaction[]}) {
    this.atomicTransactions = atomicTransactions;
  }

  makeBundles() {
    const atomicTransactionsGroupedByBundleId = this.atomicTransactions
      .reduce((groups: Record<string, AtomicTransaction[]>, transaction) => {
        if (!transaction.bundleId) {
          throw new Error(`Cannot bundle transaction without a bundleId ${JSON.stringify(transaction.toJson())}`);
        }
        if (!groups[transaction.bundleId]) {
          // eslint-disable-next-line no-param-reassign
          groups[transaction.bundleId] = [];
        }
        groups[transaction.bundleId].push(transaction);
        return groups;
      }, {});


    const orphans = Object.entries(atomicTransactionsGroupedByBundleId).filter(([k, v]) => { console.log('vvv', v, v.length === 1); return v.length === 1; });
    console.log(atomicTransactionsGroupedByBundleId);
    console.log('orphans', , orphans.map(([k, o]) => o[0].toJson()));
  }
}

export default TransactionBundler;
