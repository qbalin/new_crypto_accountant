import AtomicTransaction from './atomic_transaction';
import Currency from './currency';

export enum BundleStatus {
  complete = 'complete',
  incomplete = 'incomplete'
}

export enum BundleAction {
  transfer = 'transfer',
  trade = 'trade',
  toBeDetermined = 'toBeDetermined'
}

class TransactionBundle {
  readonly atomicTransactions: AtomicTransaction[];

  readonly action: BundleAction;

  readonly status: BundleStatus;

  readonly id: string;

  private privateNonFeeTransactions: null | AtomicTransaction[];

  private privateSynthetizable: null | boolean;

  constructor({
    atomicTransactions, action, status, id,
  } :
  {
    atomicTransactions: AtomicTransaction[],
    action: BundleAction,
    status: BundleStatus,
    id: string
  }) {
    this.status = status;
    this.atomicTransactions = atomicTransactions;
    this.action = action;
    this.id = id;
    this.privateNonFeeTransactions = null;
    this.privateSynthetizable = null;
  }

  get fromControlled() {
    return this.atomicTransactions.some((transaction) => transaction.from.controlled);
  }

  get toControlled() {
    return this.atomicTransactions.some((transaction) => transaction.to.controlled);
  }

  get nonFeeTransactions() {
    this.privateNonFeeTransactions ||= this.atomicTransactions.filter((t) => !t.isFeePayment);
    return this.privateNonFeeTransactions;
  }

  get synthetizable() {
    if (this.privateSynthetizable !== null) {
      return this.privateSynthetizable;
    }
    if (this.nonFeeTransactions.length === 0) {
      this.privateSynthetizable = false;
      return this.privateSynthetizable;
    }
    this.privateSynthetizable = Object
      .values(this.nonFeeTransactions.reduce((memo, transaction) => {
        memo.from.add(transaction.from);
        memo.createdAt.add(transaction.createdAt.valueOf);
        memo.to.add(transaction.to);
        memo.currencies.add(transaction.currency);
        return memo;
      }, {
        currencies: new Set(), createdAt: new Set(), to: new Set(), from: new Set(),
      })).reduce((memo, set) => memo && set.size === 1, true as boolean);

    return this.privateSynthetizable;
  }

  get syntheticTransaction() {
    // This is the "main" transaction of an incomplete transfer bundle. Normally, this
    // would be the other transaction that is not a fee in the bundle, but UTXO transactions
    // are in fact represented by many transactions, which we intend to reduce to a single
    // one here.
    if (!this.synthetizable) {
      throw new Error(`To be aggregated in a single synthetic transaction, all transactions to, from, currency and createdAt must match. Offending bundle: ${JSON.stringify(this, null, 2)}`);
    }

    const {
      to, from, currency, createdAt, bundleId,
    } = this.nonFeeTransactions[0];

    return new AtomicTransaction({
      to,
      from,
      createdAt,
      currency,
      action: '--------',
      bundleId,
      amount: this.nonFeeTransactions.reduce((memo, transaction) => transaction.amount + memo, 0),
    });
  }
    }
  }

  complete() {
    return new TransactionBundle({
      atomicTransactions: this.atomicTransactions,
      status: BundleStatus.complete,
      action: this.action,
      id: this.id,
    });
  }

  equal(other: TransactionBundle) {
    if (this.atomicTransactions.length !== other.atomicTransactions.length) {
      return false;
    }
    return this.atomicTransactions
      .every((transaction) => other.atomicTransactions.some((t) => transaction.equal(t)));
  }
}

export default TransactionBundle;
