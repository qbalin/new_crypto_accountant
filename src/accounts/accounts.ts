import AtomicTransaction from '../models/atomic_transaction';
import Account from './account';

class Accounts {
  public readonly all: Account[];

  constructor({ accounts } : { accounts: Account[] }) {
    this.all = accounts;
  }

  async retrieveData() {
    const atomicTransactions: AtomicTransaction[] = [];
    this.all.forEach(async (account) => {
      atomicTransactions.push(...await account.retrieveData());
    });
    return atomicTransactions;
  }
}

export default Accounts;
