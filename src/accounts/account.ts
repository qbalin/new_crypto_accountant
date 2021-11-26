import { ToAtomicTransactionable, TransactionBundlable } from '../models/model_types';

abstract class Account {
  abstract retrieveData() : Promise<(ToAtomicTransactionable & TransactionBundlable)[]>
}

export default Account;
