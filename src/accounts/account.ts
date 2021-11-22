import { ToJsonable, ToAtomicTransactionable, TransactionBundlable } from '../models/model_types';

abstract class Account {
  abstract retrieveData() : Promise<(ToJsonable & ToAtomicTransactionable & TransactionBundlable)[]>
}

export default Account;
