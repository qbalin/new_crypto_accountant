import { ToAtomicTransactionable, ToJsonable, TransactionBundlable } from '../models/model_types';
import TransactionBundle, { BundleStatus } from '../models/transaction_bundle';
import { groupBy } from '../utils';

class TransactionBundler {
  readonly data: (ToJsonable & ToAtomicTransactionable & TransactionBundlable)[];

  constructor({ data } : { data: (ToJsonable & ToAtomicTransactionable & TransactionBundlable)[]}) {
    this.data = data;
  }

  makeBundles() {
    const bundles = this.data.map((d) => d.transactionBundle());

    // Some bundles are complete for sure: BUY and SELL trades
    // from exchanges are packaged in a single bundle
    const { completeBundles, incompleteBundles } = TransactionBundler
      .separateCompleteAndIncompleteBundles(bundles);

    // Transfers between two owned decentralized account will produce
    // duplicate records that should not be double counted
    const deduplicatedIncompleteBundles = TransactionBundler.removeDuplicates(
      incompleteBundles,
    );

    // Now, some records share an id together, and some are unique by id
    const { bundlesWithSharedId, bundlesWithUniqueId } = TransactionBundler
      .separateBundlesWithUniqueIdAndThoseWithSharedId(deduplicatedIncompleteBundles);

    const cleanedBundles = TransactionBundler.mergeSiblings(bundlesWithSharedId);

    const { consolidatedBundles, orphanBundles } = TransactionBundler
      .associateBundlesByAmountCurrencyAndTime(bundlesWithUniqueId);

    return [
      ...completeBundles,
      ...bundlesWithUniqueId,
      ...cleanedBundles,
      ...consolidatedBundles,
      ...orphanBundles,
    ];
  }

  static associateBundlesByAmountCurrencyAndTime(bundles: TransactionBundle[]) {
    return { consolidatedBundles: bundles, orphanBundles: [] };
  }

  private static separateCompleteAndIncompleteBundles(bundles: TransactionBundle[]) {
    return bundles.reduce((
      memo: {[key in 'completeBundles' | 'incompleteBundles']: TransactionBundle[]},
      bundle,
    ) => {
      if (bundle.status === BundleStatus.complete) {
        memo.incompleteBundles.push(bundle);
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

    const bundleGroupsWithMaybeDuplicates = Object.values(groupBy(bundles, 'id'));

    return bundleGroupsWithMaybeDuplicates
      .reduce((memo, bundlesWithMaybeDuplicates) => {
        const bundlesWithoutCollisions = bundlesWithMaybeDuplicates
          .reduce((accu, bundle, index) => {
            for (let i = index + 1; i < bundlesWithMaybeDuplicates.length; i += 1) {
              if (bundle.equal(bundlesWithMaybeDuplicates[i])) {
                accu.delete(bundle);
                console.log('DROPPING', JSON.stringify(bundle, null, 2));
                break;
              }
            }
            return accu;
          }, new Set(bundlesWithMaybeDuplicates));

        memo.push(...Array.from(bundlesWithoutCollisions));
        return memo;
      }, []);
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
