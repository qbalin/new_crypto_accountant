import fs from 'fs';
import TransactionBundle, { BundleAction, BundleStatus } from '../models/transaction_bundle';
import { groupBy, partition } from '../utils';

class BundleConsolidator {
  readonly bundles: TransactionBundle[];

  constructor({ bundles } : { bundles: TransactionBundle[]}) {
    this.bundles = bundles;
  }

  consolidateBundles({ shitcoins } : { shitcoins: string[] }) {
    const bundles = this.bundles
      .filter((b) => !b.isEmpty);

    const { shitcoinBundles, legitcoinBundles } = BundleConsolidator
      .separateShitcoinsFromLegitCoins(bundles, shitcoins);

    // Some bundles are complete for sure: BUY and SELL trades
    // from exchanges are packaged in a single bundle
    const { completeBundles, incompleteBundles } = BundleConsolidator
      .separateCompleteAndIncompleteBundles(legitcoinBundles);

    // Transfers between two owned decentralized account will produce
    // duplicate records that should not be double counted.
    // Dulicates are complete bundles, as they represent a transfer between two
    // controlled accounts
    const { completeDeduplicatedBundles, incompleteDeduplicatedBundles } = BundleConsolidator
      .removeDuplicates(incompleteBundles);

    // Now, some records share an id together, and some are unique by id
    const { bundlesWithSharedId, bundlesWithUniqueId } = BundleConsolidator
      .separateBundlesWithUniqueIdAndThoseWithSharedId(incompleteDeduplicatedBundles);

    // Those that have a shared id can be merged into one single bundle
    const completeMergedBundles = BundleConsolidator.mergeSiblings(bundlesWithSharedId);

    // Bundles where some transactions are from controlled AND to controlled are probably
    // swaps, or deposits / repays from DeFi platforms
    const { toAndFromControlled, toXorFromControlled } = BundleConsolidator
      .separateBundlesWithToAndFromControlledFromOther(bundlesWithUniqueId);

    const { consolidatedBundles, orphanBundles } = BundleConsolidator
      .mergeBundlesByAmountCurrencyAndTime(toXorFromControlled);

    console.log('orphanBundles', orphanBundles.length);
    console.log(JSON.stringify(orphanBundles, null, 2));
    console.log('orphanBundles', orphanBundles.length);

    fs.writeFileSync('./orphans', JSON.stringify(orphanBundles, null, 2));
    fs.writeFileSync('./shitcoinBundles', JSON.stringify(shitcoinBundles, null, 2));
    fs.writeFileSync('./swapsOrDepositsOrRepays', JSON.stringify(toAndFromControlled, null, 2));
    fs.writeFileSync('./consolidatedBundles', JSON.stringify(consolidatedBundles, null, 2));
    fs.writeFileSync('./completeMergedBundles', JSON.stringify(completeMergedBundles, null, 2));
    fs.writeFileSync('./completeDeduplicatedBundles', JSON.stringify(completeDeduplicatedBundles, null, 2));
    fs.writeFileSync('./completeBundles', JSON.stringify(completeBundles, null, 2));

    return [
      ...completeBundles,
      ...completeDeduplicatedBundles,
      ...completeMergedBundles,
      ...consolidatedBundles,
      ...toAndFromControlled,
      ...orphanBundles,
    ];
  }

  static separateShitcoinsFromLegitCoins(bundles: TransactionBundle[], shitcoins: string[]) {
    const [shitcoinBundles, legitcoinBundles] = partition(bundles, (bundle) => shitcoins
      .map((s) => s.toUpperCase())
      .includes(bundle.atomicTransactions[0].currency.ticker));
    return { shitcoinBundles, legitcoinBundles };
  }

  static mergeBundlesByAmountCurrencyAndTime(bundles: TransactionBundle[]) {
    // Separate bundles where a "from" address is our from the one where the "to" address is our.
    // No bundle should have transactions where both the "to" and the "from" are our at that point.
    // Iterate the list of "from"s, and try to map it to the set of "to"s
    // A good "to" candidate should have the same currency, a timestamp that comes after "from"'s
    // and an identical or very close amount
    // If a good candidate is found, bundle them together. Else, pushe the from in the list
    // of orphans. If some "to"'s are left in the set, push the to the list of orphans

    const orphanBundles: TransactionBundle[] = [];
    const { fromControlled, toControlled } = bundles.reduce(
      (memo, bundle) => {
        if (bundle.fromControlled && bundle.toControlled) {
          throw new Error(`It is unexpected to have incomplete bundles with no siblings that contain atomic transactions with both the "from" and "to" address being controlled by the user. Got: ${JSON.stringify(bundle, null, 2)}.`);
        }
        if (!bundle.synthetizable) {
          // If the bundle is made of transactions with heterogenous to, from, createdAt or currency
          // they cannot be part of a transfer
          orphanBundles.push(bundle);
          return memo;
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

    fromControlled.forEach((fromBundle) => {
      const oneHour = 3600 * 1000;
      const toMatch = Array
        .from(toControlled)
        .sort((a, b) => +a.syntheticTransaction.createdAt - +b.syntheticTransaction.createdAt)
        .find((toBundle) => {
          const toAddress = toBundle.syntheticTransaction.to;
          const fromAddress = fromBundle.syntheticTransaction.from;
          const toCurrency = toBundle.syntheticTransaction.currency;
          const fromCurrency = fromBundle.syntheticTransaction.currency;
          const toAmount = toBundle.syntheticTransaction.amount;
          const fromAmount = fromBundle.syntheticTransaction.amount;
          const toCreatedAt = toBundle.syntheticTransaction.createdAt;
          const fromCreatedAt = fromBundle.syntheticTransaction.createdAt;

          return toAddress !== fromAddress
            && toCurrency === fromCurrency
            && Math.abs(toAmount - fromAmount) <= ((toAmount + fromAmount) / 2) * 1e-6
            // It is bizarre, but sometimes the clocks are not well sync'd between platforms,
            // and some record an inbound transaction before the outbound was recorded
            && (toCreatedAt >= fromCreatedAt || Math.abs(+toCreatedAt - +fromCreatedAt) < oneHour);
        });

      if (toMatch) {
        consolidatedBundles.push(
          new TransactionBundle({
            atomicTransactions: [...fromBundle.atomicTransactions, ...toMatch.atomicTransactions],
            status: BundleStatus.complete,
            action: BundleAction.toBeDetermined,
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

  static separateBundlesWithToAndFromControlledFromOther(bundles: TransactionBundle[]) {
    const [toAndFromControlled, toXorFromControlled] = partition(
      bundles,
      (bundle) => bundle.toControlled && bundle.fromControlled,
    );
    return { toAndFromControlled, toXorFromControlled };
  }

  private static separateCompleteAndIncompleteBundles(bundles: TransactionBundle[]) {
    const [completeBundles, incompleteBundles] = partition(bundles, (bundle) => bundle.isComplete);
    return { completeBundles, incompleteBundles };
  }

  private static separateBundlesWithUniqueIdAndThoseWithSharedId(bundles: TransactionBundle[]) {
    // Group the bundles by id
    const idToBundlesMap = groupBy(bundles, (bundle) => bundle.id);

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

    const bundleGroupsWithMaybeDuplicates = Object.values(groupBy(bundles, (bundle) => bundle.id));

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
            action: BundleAction.transfer,
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
    const bundlesGroupedById = Object.values(groupBy(bundles, (bundle) => bundle.id));
    return bundlesGroupedById.map((groupOfBundles) => new TransactionBundle({
      atomicTransactions: groupOfBundles.flatMap((g) => g.atomicTransactions),
      action: groupOfBundles[0].action,
      status: BundleStatus.complete,
      id: groupOfBundles[0].id,
    }));
  }
}

export default BundleConsolidator;
