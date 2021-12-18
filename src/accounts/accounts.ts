import TransactionBundle from '../models/transaction_bundle';
import Account from './account';

class Accounts {
  public readonly all: Account[];

  constructor({ accounts } : { accounts: Account[] }) {
    this.all = accounts;
  }

  async retrieveData() {
    let promise: Promise<TransactionBundle[]> = Promise.resolve([]);
    this.all.forEach((account) => {
      promise = promise
        .then(async (transactions) => (await account.retrieveData()).concat(transactions));
    });
    return promise;
  }
}

export default Accounts;
