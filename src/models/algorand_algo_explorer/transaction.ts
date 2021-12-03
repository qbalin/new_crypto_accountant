import DecentralizedAddress from '../../addresses/decentralized_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedBlockchain } from '../../config_types';
import chainToCoinMap from '../../currencies';
import AtomicTransaction, { PAY_FEE } from '../atomic_transaction';
import TransactionBundle, { BundleAction, BundleStatus } from '../transaction_bundle';
import Asset from './asset';

type Attributes = {
  id: string,
  fee: number,
  'first-valid': number,
  'last-valid': number,
  sender: string,
  'round-time': number,
  'tx-type': 'pay' | 'keyreg' | 'acfg' | 'axfer' | 'afrz',
  'payment-transaction'?: {
    amount: number,
    receiver: string,
  },
  'asset-transfer-transaction'?: {
    amount: number,
    'asset-id': number,
    receiver: string
  }
}

class Transaction {
  private readonly attributes: Attributes

  private atomicTransactions: AtomicTransaction[] | null;

  private readonly assetIndexToAssetMap: Record<string, Asset>;

  constructor(
    { attributes, assetIndexToAssetMap } :
    { attributes: Record<string, any>, assetIndexToAssetMap: Record<string, Asset> },
  ) {
    this.atomicTransactions = null;
    this.attributes = attributes as Attributes;
    this.assetIndexToAssetMap = assetIndexToAssetMap;
  }

  get createdAt() {
    return new Date(this.attributes['round-time'] * 1000);
  }

  get fromAddress() {
    return this.attributes.sender.toLowerCase();
  }

  get toAddress() {
    const receiver = this.attributes['payment-transaction']?.receiver || this.attributes['asset-transfer-transaction']?.receiver;
    if (!receiver) {
      throw new Error(`Receiver not found for ${JSON.stringify(this)}`);
    }
    return receiver.toLowerCase();
  }

  get fee() {
    return this.attributes.fee * 1e-6;
  }

  get amount() {
    if (this.attributes['payment-transaction']) {
      return this.attributes['payment-transaction'].amount * 1e-6;
    }
    if (this.attributes['asset-transfer-transaction']) {
      const assetId = this.attributes['asset-transfer-transaction']['asset-id'];
      const asset = this.assetIndexToAssetMap[assetId];
      if (!asset) {
        throw new Error(`Asset not found for ${JSON.stringify(this)}`);
      }
      return asset.toDecimal(this.attributes['asset-transfer-transaction']);
    }
    throw new Error(`Amount not found for ${JSON.stringify(this)}`);
  }

  get currency() {
    if (this.attributes['payment-transaction']) {
      return chainToCoinMap[SupportedBlockchain.Algorand];
    }
    if (this.attributes['asset-transfer-transaction']) {
      const assetId = this.attributes['asset-transfer-transaction']['asset-id'];
      const asset = this.assetIndexToAssetMap[assetId];
      if (!asset) {
        throw new Error(`Asset not found for ${JSON.stringify(this)}`);
      }
      return asset.name;
    }
    throw new Error(`Currency not found for ${JSON.stringify(this)}`);
  }

  get transactionHash() {
    return this.attributes.id;
  }

  get bundleId() {
    return `${SupportedBlockchain.Algorand}-${this.transactionHash}`;
  }

  transactionBundle() {
    // "Opt-in" transactions are done from a wallet to the same wallet:
    // https://developer.algorand.org/docs/get-details/transactions/#opt-in-to-an-asset
    const status = this.fromAddress === this.toAddress
      ? BundleStatus.complete
      : BundleStatus.incomplete;
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions(),
      action: BundleAction.transfer,
      status,
      id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }
    const transactions = [];
    if (['pay', 'axfer'].includes(this.attributes['tx-type'])) {
      transactions.push(
        new AtomicTransaction({
          createdAt: this.createdAt,
          action: '---------',
          currency: this.currency,
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
      );
    }

    this.atomicTransactions = [
      ...transactions,
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: PAY_FEE,
        currency: chainToCoinMap[SupportedBlockchain.Algorand],
        from: DecentralizedAddress.getInstance({
          address: this.fromAddress,
          chain: SupportedBlockchain.Algorand,
        }),
        to: new VoidAddress({ note: 'Miner' }),
        amount: this.fee,
        bundleId: this.bundleId,
      }),
    ];
    return this.atomicTransactions;
  }
}

export default Transaction;
