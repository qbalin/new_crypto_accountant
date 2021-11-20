import AtomicTransaction from '../models/atomic_transaction';

abstract class Account {
  abstract retrieveData() : Promise<AtomicTransaction[]>
}

export default Account;
