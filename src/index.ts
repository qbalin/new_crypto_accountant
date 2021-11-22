import Config from './config';
import AtomicTransaction from './models/atomic_transaction';
import TransactionBundler from './aggregators/transaction_bundler';
/*
# Goal

We want to be able to output Atomic Legder Entries for each
crypto account, in the following format:

```json
// AtomicLedgerEntry
{
    from: [AtomicAccount],
    to: [AtomicAccount],
    timestamp,
    amount,
}
```

An Atomic Account refers to an centralized or decentralized
account and holding a single kind of currency.

Once we have Atomic Ledger Entries, it should be easy to
create time series, aggregate them by currency or get
their equivalent price in fiat, etc.

# Steps

Do achieve this, we will need to:

1. Pull the data archive from all accounts and output it in a normalized way
2. Process the data to output Atomic Ledger Entries
*/
(async () => {
  const accounts = Config.parse('./config.json');
  const atomicTransactions = await accounts.retrieveData();
  const bundler = new TransactionBundler({ atomicTransactions });
  bundler.makeBundles();
  const res = atomicTransactions.reduce<AtomicTransaction[]>((memo, transaction) => {
    if (transaction.from.toString() !== 'Void') {
      if (!memo[`${transaction.from.toString()}-${transaction.currency}`]) {
        memo[`${transaction.from.toString()}-${transaction.currency}`] = 0;
      }
      memo[`${transaction.from.toString()}-${transaction.currency}`] -= transaction.amount;
    }
    if (transaction.to.toString() !== 'Void') {
      if (!memo[`${transaction.to.toString()}-${transaction.currency}`]) {
        memo[`${transaction.to.toString()}-${transaction.currency}`] = 0;
      }
      memo[`${transaction.to.toString()}-${transaction.currency}`] += transaction.amount;
    }
    return memo;
  }, {});
  console.log(res);
})();
