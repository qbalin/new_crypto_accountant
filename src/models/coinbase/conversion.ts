import PlatformAddress from '../../addresses/platform_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedPlatform } from '../../config_types';
import AtomicTransaction from '../atomic_transaction';
import { ToAtomicTransactionable, ToJsonable, TransactionBundlable } from '../model_types';
import TransactionBundle, { BundleStatus } from '../transaction_bundle';

/* eslint-disable camelcase */
interface Attributes {
  readonly id: string,
  readonly amount: string,
  readonly balance: string,
  readonly created_at: string,
  readonly details: { conversion_id: string },
}

class Conversion implements ToJsonable, ToAtomicTransactionable, TransactionBundlable {
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

  toJson() {
    return this.attributes;
  }

  transactionBundle() {
    return new TransactionBundle({ atomicTransactions: this.toAtomicTransactions(), action: '', status: BundleStatus.complete });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: 'conversion',
        currency: 'USDC',
        from: new VoidAddress(), // Coinbase Inc
        to: new PlatformAddress({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: 'conversion',
        currency: 'USD',
        from: new PlatformAddress({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        to: new VoidAddress(), // Coinbase Inc
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }
}

export default Conversion;
