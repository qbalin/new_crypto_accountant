import PlatformAddress from '../../addresses/platform_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedPlatform } from '../../config_types';
import AtomicTransaction from '../atomic_transaction';
import Currency from '../currency';
import TransactionBundle, { BundleAction, BundleStatus } from '../transaction_bundle';

/* eslint-disable camelcase */
interface Attributes {
  readonly id: string,
  readonly amount: string,
  readonly balance: string,
  readonly created_at: string,
  readonly details: { conversion_id: string },
}

class Conversion {
  private readonly attributes: Attributes;

  private readonly accountNickname: string;

  private atomicTransactions: AtomicTransaction[] | null

  constructor({ attributes, accountNickname } :
    { attributes: Record<string, any>, accountNickname: string }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'amount', 'balance', 'created_at', 'details', 'type']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.atomicTransactions = null;
    this.accountNickname = accountNickname;
    this.attributes = attributes as Attributes;
  }

  get id() {
    return this.attributes.id;
  }

  get amount() {
    return parseFloat(this.attributes.amount);
  }

  get createdAt() {
    return new Date(this.attributes.created_at);
  }

  get bundleId() {
    return `${SupportedPlatform.Coinbase}-conversion_id-${this.id}`;
  }

  transactionBundle() {
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions().filter((t) => t.amount !== 0),
      action: BundleAction.trade,
      status: BundleStatus.complete,
      id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    let usdcTo;
    let usdcFrom;
    if (this.amount > 0) {
      usdcTo = PlatformAddress.getInstance({
        nickname: this.accountNickname,
        platform: SupportedPlatform.Coinbase,
      });
      usdcFrom = VoidAddress.getInstance({ note: 'Coinbase Inc.' });
    } else {
      usdcFrom = PlatformAddress.getInstance({
        nickname: this.accountNickname,
        platform: SupportedPlatform.Coinbase,
      });
      usdcTo = VoidAddress.getInstance({ note: 'Coinbase Inc.' });
    }

    const usdTo = usdcFrom;
    const usdFrom = usdcTo;

    const absAmount = Math.abs(this.amount);

    this.atomicTransactions = [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: 'conversion',
        currency: Currency.getInstance({ ticker: 'USDC' }),
        from: usdcFrom,
        to: usdcTo,
        amount: absAmount,
        bundleId: this.bundleId,
      }),
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: 'conversion',
        currency: Currency.getInstance({ ticker: 'USD' }),
        from: usdFrom,
        to: usdTo,
        amount: absAmount,
        bundleId: this.bundleId,
      }),
    ];

    return this.atomicTransactions;
  }
}

export default Conversion;
