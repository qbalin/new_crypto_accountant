import AtomicTransaction from './atomic_transaction';
import TransactionBundle from './transaction_bundle';

export interface ToJsonable {
  toJson: () => Record<string, any>
}

export interface ToAtomicTransactionable {
  toAtomicTransactions: () => AtomicTransaction[]
}

export interface TransactionBundlable {
  transactionBundle: () => TransactionBundle
}
