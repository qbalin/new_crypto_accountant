import AtomicTransaction from '../models/atomic_transaction';
import Account from './account';

class Accounts {
  public readonly all: Account[];

  constructor({ accounts } : { accounts: Account[] }) {
    this.all = accounts;
  }

  async retrieveData() {
    let promise: Promise<AtomicTransaction[]> = Promise.resolve([]);
    this.all.forEach((account) => {
      promise = promise
        .then(async (transactions) => (await account.retrieveData()).concat(transactions));
    });
    return promise;
  }
}

export default Accounts;
