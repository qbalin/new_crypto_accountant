import TransactionBundle from '../models/transaction_bundle';

abstract class Account {
  abstract retrieveData() : Promise<TransactionBundle[]>
}

export default Account;
