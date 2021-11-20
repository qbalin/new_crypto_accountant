import Config from './config';
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
const accounts = Config.parse('./config.json');

accounts.forEach(async (account) => {
  await account.retrieveData();
});
