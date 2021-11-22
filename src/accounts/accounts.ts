import { ToAtomicTransactionable, ToJsonable, TransactionBundlable } from '../models/model_types';
import Account from './account';

class Accounts {
  public readonly all: Account[];

  constructor({ accounts } : { accounts: Account[] }) {
    this.all = accounts;
  }

  async retrieveData() : Promise<(ToJsonable & ToAtomicTransactionable & TransactionBundlable)[]> {
    let promise: Promise<
      (ToJsonable & ToAtomicTransactionable & TransactionBundlable)[]
    > = Promise.resolve([]);
    this.all.forEach((account) => {
      promise = promise
        .then(async (transactions) => (await account.retrieveData()).concat(transactions));
    });
    return promise;
  }
}

export default Accounts;
