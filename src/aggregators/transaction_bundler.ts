import AtomicTransaction from '../models/atomic_transaction';
import { ToAtomicTransactionable, ToJsonable, TransactionBundlable } from '../models/model_types';
import { BundleStatus } from '../models/transaction_bundle';

class TransactionBundler {
  readonly data: (ToJsonable & ToAtomicTransactionable & TransactionBundlable)[];

  constructor({ data } : { data: (ToJsonable & ToAtomicTransactionable & TransactionBundlable)[]}) {
    this.data = data;
  }

  makeBundles() {
    const bundles = this.data.map((d) => d.transactionBundle());
    const orphans = bundles.filter((b) => b.status === BundleStatus.incomplete);
    console.log(orphans.map((o) => o.atomicTransactions.flatMap((at) => at.toJson())));
  }
}

export default TransactionBundler;
