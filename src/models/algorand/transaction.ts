import DecentralizedAddress from '../../addresses/decentralized_address';
import { SupportedBlockchain } from '../../config_types';
import chainToCoinMap from '../../currencies';
import AtomicTransaction from '../atomic_transaction';
import TransactionBundle, { BundleStatus } from '../transaction_bundle';

/* eslint-disable no-use-before-define */
class Transaction {
  private readonly attributes: Attributes

  static readonly attributesList = ['close-rewards', 'closing-amount', 'confirmed-round', 'fee', 'first-valid', 'genesis-hash', 'genesis-id', 'id', 'intra-round-offset', 'last-valid', 'payment-transaction', 'receiver-rewards', 'round-time', 'sender', 'sender-rewards', 'signature', 'tx-type'] as const;

  private atomicTransactions: AtomicTransaction[] | null;

  constructor(
    { attributes } : { attributes: Record<string, any> },
  ) {
    Transaction.attributesList.forEach((attribute) => {
      if (!Object.keys(attributes).includes(attribute)) {
        throw new Error(`expected to find ${attribute} in ${Object.keys(attributes)}`);
      }
    });

    this.atomicTransactions = null;
    this.attributes = attributes as Attributes;
  }

  get createdAt() {
    return new Date(this.attributes['round-time'] * 1000);
  }

  get fromAddress() {
    return this.attributes.sender.toLowerCase();
  }

  get toAddress() {
    return this.attributes['payment-transaction'].receiver.toLowerCase();
  }

  get amount() {
    return parseInt(this.attributes['payment-transaction'].amount, 10) * 1e-6;
  }

  get transactionHash() {
    return this.attributes.id.toLowerCase();
  }

  get bundleId() {
    return `${SupportedBlockchain.Algorand}-${this.transactionHash}`;
  }

  transactionBundle() {
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions(), action: '', status: BundleStatus.incomplete, id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    this.atomicTransactions = [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '---------',
        currency: chainToCoinMap[SupportedBlockchain.Algorand],
        from: DecentralizedAddress.getInstance({
          address: this.fromAddress,
          chain: SupportedBlockchain.Algorand,
        }),
        to: DecentralizedAddress.getInstance({
          address: this.toAddress,
          chain: SupportedBlockchain.Algorand,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
    return this.atomicTransactions;
  }
}

export type Attributes = Record<
  typeof Transaction.attributesList[number],
  any
>

export default Transaction;
