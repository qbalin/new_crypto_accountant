import { ToAtomicTransactionable, TransactionBundlable } from '../models/model_types';
import TransactionBundle, { BundleStatus } from '../models/transaction_bundle';
import { groupBy } from '../utils';

class TransactionBundler {
  readonly data: (ToAtomicTransactionable & TransactionBundlable)[];

  constructor({ data } : { data: (ToAtomicTransactionable & TransactionBundlable)[]}) {
    this.data = data;
  }

  makeBundles() {
    const bundles = this.data
      .map((d) => d.transactionBundle())
      .filter((b) => b.atomicTransactions.length);

    // Some bundles are complete for sure: BUY and SELL trades
    // from exchanges are packaged in a single bundle
    const { completeBundles, incompleteBundles } = TransactionBundler
      .separateCompleteAndIncompleteBundles(bundles);

    // Transfers between two owned decentralized account will produce
    // duplicate records that should not be double counted.
    // Dulicates are complete bundles, as they represent a transfer between two
    // controlled accounts
    const { completeDeduplicatedBundles, incompleteDeduplicatedBundles } = TransactionBundler
      .removeDuplicates(incompleteBundles);

    // Now, some records share an id together, and some are unique by id
    const { bundlesWithSharedId, bundlesWithUniqueId } = TransactionBundler
      .separateBundlesWithUniqueIdAndThoseWithSharedId(incompleteDeduplicatedBundles);

    // Those that have a shared id can be merged into one single bundle
    const completeMergedBundles = TransactionBundler.mergeSiblings(bundlesWithSharedId);

    const { consolidatedBundles, orphanBundles } = TransactionBundler
      .mergeBundlesByAmountCurrencyAndTime(bundlesWithUniqueId);

    console.log('orphanBundles', orphanBundles.length);
    console.log(JSON.stringify(orphanBundles, null, 2));
    console.log('orphanBundles', orphanBundles.length);

    return [
      ...completeBundles,
      ...bundlesWithUniqueId,
      ...completeDeduplicatedBundles,
      ...completeMergedBundles,
      ...consolidatedBundles,
      ...orphanBundles,
    ];
  }

  static mergeBundlesByAmountCurrencyAndTime(bundles: TransactionBundle[]) {
    // Separate bundles where a "from" address is our from the one where the "to" address is our.
    // No bundle should have transactions where both the "to" and the "from" are our.
    // Iterate the list of "from"s, and try to map it to the set of "to"s
    // A good "to" candidate should have the same currency, a timestamp that comes after "from"'s
    // and an identical or very close amount
    // If a good candidate is found, bundle them together. Else, pushe the from in the list
    // of orphans. If some "to"'s are left in the set, push the to the list of orphans

    const { fromControlled, toControlled } = bundles.reduce(
      (memo, bundle) => {
        if (bundle.fromControlled && bundle.toControlled) {
          throw new Error(`It is unexpected to have incomplete bundles with no siblings that contain atomic transactions with both the "from" and "to" address being controlled by the user. Got: ${JSON.stringify(bundle, null, 2)}.`);
        }
        if (bundle.fromControlled) {
          memo.fromControlled.add(bundle);
        } else if (bundle.toControlled) {
          memo.toControlled.add(bundle);
        } else {
          throw new Error(`It is unexpected to have bundles containing transactions where the user is neither the recipient nor the sender. Got: ${JSON.stringify(bundle)}.`);
        }
        return memo;
      }, {
        fromControlled: new Set() as Set<TransactionBundle>,
        toControlled: new Set() as Set<TransactionBundle>,
      },
    );

    const consolidatedBundles: TransactionBundle[] = [];
    const orphanBundles: TransactionBundle[] = [];

    fromControlled.forEach((fromBundle) => {
      const toMatch = Array
        .from(toControlled)
        .sort((a, b) => +a.mainAtomicTransaction.createdAt - +b.mainAtomicTransaction.createdAt)
        .find((toBundle) => {
          const toAddress = toBundle.mainAtomicTransaction.to;
          const fromAddress = fromBundle.mainAtomicTransaction.from;
          const toCurrency = toBundle.mainAtomicTransaction.currency;
          const fromCurrency = fromBundle.mainAtomicTransaction.currency;
          const toAmount = toBundle.mainAtomicTransaction.amount;
          const fromAmount = fromBundle.mainAtomicTransaction.amount;
          const toCreatedAt = toBundle.mainAtomicTransaction.createdAt;
          const fromCreatedAt = fromBundle.mainAtomicTransaction.createdAt;

          return toAddress !== fromAddress
            && toCurrency === fromCurrency
            && Math.abs(toAmount - fromAmount) <= ((toAmount + fromAmount) / 2) * 1e-6
            && toCreatedAt >= fromCreatedAt;
        });

      if (toMatch) {
        consolidatedBundles.push(
          new TransactionBundle({
            atomicTransactions: [...fromBundle.atomicTransactions, ...toMatch.atomicTransactions],
            status: BundleStatus.complete,
            action: '',
            id: fromBundle.id + toMatch.id,
          }),
        );
        toControlled.delete(toMatch);
      } else {
        orphanBundles.push(fromBundle);
      }
    });

    orphanBundles.push(...Array.from(toControlled));

    return { consolidatedBundles, orphanBundles };
  }

  private static separateCompleteAndIncompleteBundles(bundles: TransactionBundle[]) {
    return bundles.reduce((
      memo: {[key in 'completeBundles' | 'incompleteBundles']: TransactionBundle[]},
      bundle,
    ) => {
      if (bundle.status === BundleStatus.complete) {
        memo.completeBundles.push(bundle);
      } else {
        memo.incompleteBundles.push(bundle);
      }
      return memo;
    }, { completeBundles: [], incompleteBundles: [] });
  }

  private static separateBundlesWithUniqueIdAndThoseWithSharedId(bundles: TransactionBundle[]) {
    // Group the bundles by id
    const idToBundlesMap = groupBy(bundles, 'id');

    return Object
      .values(idToBundlesMap)
      .reduce((memo: Record<'bundlesWithSharedId' | 'bundlesWithUniqueId', TransactionBundle[]>, bundlesToInspect) => {
        if (bundlesToInspect.length > 1) {
          memo.bundlesWithSharedId.push(...bundlesToInspect);
        } else {
          memo.bundlesWithUniqueId.push(...bundlesToInspect);
        }
        return memo;
      }, { bundlesWithSharedId: [], bundlesWithUniqueId: [] });
  }

  private static removeDuplicates(bundles: TransactionBundle[]) {
    // Removing pure duplicate transactions that may come from a decentralized to decentralized
    // transaction. If I send 1 ETH from account A to account B, and I own both accounts, etherscan
    // report will report that transaction twice, one from A's reports, and once from B's
    // A duplicated bundle is complete, as it is a transaction from a controlled account to another.

    const bundleGroupsWithMaybeDuplicates = Object.values(groupBy(bundles, 'id'));

    return bundleGroupsWithMaybeDuplicates.reduce((memo, bundlesWithMaybeDuplicates) => {
      // In a group of bundles, we want to distinguish the ones with or without duplicates and:
      // - Only keep one of the duplicates, mark it completed, and store it in
      //   completeDeduplicatedBundles
      // - If there is no duplicate found, store it as incompleteDeduplicatedBundles
      // To that effect, we'll
      // - make a set from the bundle
      // - make an array from the set
      // - remove one bundle out of the array
      // - find identical bundles in the array
      // - depending on if there were duplicates or not, mark the bundle appropriately
      // - remove the current bundle, and its possible duplicates from the set
      // - repeat until the set is empty
      const bundleSet = new Set(bundlesWithMaybeDuplicates);
      while (bundleSet.size > 0) {
        const bundleArray = Array.from(bundleSet);
        const bundle = bundleArray.pop() as TransactionBundle;
        const identicalBundles = bundleArray.filter((b) => b.equal(bundle));
        if (identicalBundles.length > 0) {
          if (identicalBundles.length > 1) {
            throw new Error(`There should only ever be two identical bundles max. This instance was found ${identicalBundles.length + 1} times: ${JSON.stringify(bundle, null, 2)}`);
          }
          memo.completeDeduplicatedBundles.push(new TransactionBundle({
            status: BundleStatus.complete,
            atomicTransactions: bundle.atomicTransactions,
            action: '',
            id: bundle.id,
          }));
        } else {
          memo.incompleteDeduplicatedBundles.push(bundle);
        }
        identicalBundles.forEach((b) => bundleSet.delete(b));
        bundleSet.delete(bundle);
      }
      return memo;
    }, {
      completeDeduplicatedBundles: [] as TransactionBundle[],
      incompleteDeduplicatedBundles: [] as TransactionBundle[],
    });
  }

  private static mergeSiblings(bundles: TransactionBundle[]) {
    // Siblings come from blockchain explorer reports
    // (txlist, txlistinternal, tokentx for etherscan-like explorers)
    // Merge them in one completed bundle
    const bundlesGroupedById = Object.values(groupBy(bundles, 'id'));
    return bundlesGroupedById.map((groupOfBundles) => new TransactionBundle({
      atomicTransactions: groupOfBundles.flatMap((g) => g.atomicTransactions),
      action: groupOfBundles[0].action,
      status: BundleStatus.complete,
      id: groupOfBundles[0].id,
    }));
  }
}

export default TransactionBundler;
