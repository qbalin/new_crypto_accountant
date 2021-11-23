import { ToAtomicTransactionable, ToJsonable, TransactionBundlable } from '../models/model_types';
import TransactionBundle, { BundleStatus } from '../models/transaction_bundle';

class TransactionBundler {
  readonly data: (ToJsonable & ToAtomicTransactionable & TransactionBundlable)[];

  constructor({ data } : { data: (ToJsonable & ToAtomicTransactionable & TransactionBundlable)[]}) {
    this.data = data;
  }

  makeBundles() {
    const bundles = this.data.map((d) => d.transactionBundle());
    const { completeBundles, incompleteBundles } = bundles.reduce((
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

    const cleanedBundles = TransactionBundler.removeDuplicates(incompleteBundles);

    console.log('----------------------------------');
    console.log('----------------------------------');
    console.log(JSON.stringify([...cleanedBundles, completeBundles], null, 2));
    console.log('----------------------------------');
    return [...cleanedBundles, completeBundles];
  }

  private static removeDuplicates(bundles: TransactionBundle[]) {
    // Group the bundles by id
    const idToBundlesMap = bundles.reduce((memo: Record<string, TransactionBundle[]>, bundle) => {
      if (!memo[bundle.id]) {
        // eslint-disable-next-line no-param-reassign
        memo[bundle.id] = [];
      }
      memo[bundle.id].push(bundle);
      return memo;
    }, {});

    const { maybeCollidingBundles, collisionFreeBundles } = Object
      .entries(idToBundlesMap)
      .reduce((memo: Record<'maybeCollidingBundles' | 'collisionFreeBundles', TransactionBundle[][]>, [, bundlesToInspect]) => {
        if (bundlesToInspect.length > 1) {
          memo.maybeCollidingBundles.push(bundlesToInspect);
        } else {
          memo.collisionFreeBundles.push(bundlesToInspect);
        }
        return memo;
      }, { maybeCollidingBundles: [], collisionFreeBundles: [] });

    const collisionFixedBundles = maybeCollidingBundles
      .reduce((memo, bundlesWithPossibleCollisions) => {
        const bundlesWithoutCollisions = bundlesWithPossibleCollisions
          .reduce((accu, bundle, index, bundlesToInspect) => {
            for (let i = index + 1; i < bundlesToInspect.length; i += 1) {
              if (bundle.equal(bundlesToInspect[i])) {
                accu.delete(bundle);
                console.log('DROPPING', JSON.stringify(bundle, null, 2));
                break;
              }
            }
            return accu;
          }, new Set(bundlesWithPossibleCollisions));

        memo.push(...Array.from(bundlesWithoutCollisions));
        return memo;
      }, []);

    return [...collisionFixedBundles, ...collisionFreeBundles.flat()];
  }
}

export default TransactionBundler;
