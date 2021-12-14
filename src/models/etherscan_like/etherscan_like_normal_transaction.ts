/* eslint-disable no-use-before-define */
import AtomicTransaction, { PAY_FEE } from '../atomic_transaction';
import { SupportedBlockchain } from '../../config_types';
import chainToCoinMap from '../../currencies';
import EthereumLikeAddress from '../../addresses/ethereum_like_address';
import VoidAddress from '../../addresses/void_address';
import TransactionBundle, { BundleAction, BundleStatus } from '../transaction_bundle';
import { ToAtomicTransactionable, TransactionBundlable } from '../model_types';

class EtherscanLikeNormalTransaction implements
  ToAtomicTransactionable, TransactionBundlable {
  private readonly attributes: Attributes

  readonly chain: SupportedBlockchain;

  static readonly attributesList = ['blockNumber', 'timeStamp', 'hash', 'nonce', 'blockHash', 'transactionIndex', 'from', 'to', 'value', 'gas', 'gasPrice', 'isError', 'txreceipt_status', 'input', 'contractAddress', 'cumulativeGasUsed', 'gasUsed', 'confirmations'] as const;

  private atomicTransactions: AtomicTransaction[] | null;

  constructor(
    { attributes, chain } : { attributes: Record<string, any>, chain: SupportedBlockchain },
  ) {
    EtherscanLikeNormalTransaction.attributesList.forEach((attribute) => {
      if (!Object.keys(attributes).includes(attribute)) {
        throw new Error(`expected to find ${attribute} in ${Object.keys(attributes)}`);
      }
    });

    this.atomicTransactions = null;
    this.attributes = attributes as Attributes;
    this.chain = chain;
  }

  get blockNumber() {
    return parseInt(this.attributes.blockNumber, 10);
  }

  get timeStamp() {
    return new Date(parseInt(this.attributes.timeStamp, 10) * 1000);
  }

  get hash() {
    return this.attributes.hash.toLowerCase();
  }

  get nonce() {
    return this.attributes.nonce;
  }

  get blockHash() {
    return this.attributes.blockHash.toLowerCase();
  }

  get transactionIndex() {
    return this.attributes.transactionIndex;
  }

  get from() {
    return this.attributes.from.toLowerCase();
  }

  get to() {
    return this.attributes.to.toLowerCase();
  }

  get amount() {
    return parseInt(this.attributes.value, 10) * 10 ** -18;
  }

  get gas() {
    return parseInt(this.attributes.gas, 10);
  }

  get isError() {
    return this.attributes.isError !== '0';
  }

  get success() {
    return this.attributes.txreceipt_status === '1';
  }

  get input() {
    return this.attributes.input;
  }

  get contractAddress() {
    return this.attributes.contractAddress.toLowerCase();
  }

  get cumulativeGasUsed() {
    return parseInt(this.attributes.cumulativeGasUsed, 10);
  }

  get gasSpentInEth() {
    return parseInt(this.attributes.gasUsed, 10)
    * parseInt(this.attributes.gasPrice, 10)
    * 10 ** -18;
  }

  get confirmations() {
    return parseInt(this.attributes.confirmations, 10);
  }

  transactionBundle() {
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions(),
      action: BundleAction.toBeDetermined,
      status: BundleStatus.incomplete,
      id: this.hash,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    // In case of a failure, the intended transactions does not
    // go through, but the gas fees are still paid!
    const intendedTransaction = [];
    if (this.success) {
      intendedTransaction.push(new AtomicTransaction({
        createdAt: this.timeStamp,
        action: '-----',
        currency: chainToCoinMap[this.chain],
        from: EthereumLikeAddress.getInstance({
          address: this.from,
          chain: this.chain,
        }),
        to: EthereumLikeAddress.getInstance({
          address: this.to,
          chain: this.chain,
        }),
        amount: this.amount,
        bundleId: this.hash,
      }));
    }
    this.atomicTransactions = [
      ...intendedTransaction,
      new AtomicTransaction({
        createdAt: this.timeStamp,
        action: PAY_FEE,
        currency: chainToCoinMap[this.chain],
        from: EthereumLikeAddress.getInstance({
          address: this.from,
          chain: this.chain,
        }),
        to: VoidAddress.getInstance({ note: 'Miner' }),
        amount: this.gasSpentInEth,
        bundleId: this.hash,
      }),
    ];
    return this.atomicTransactions;
  }
}

export type Attributes = Record<
  typeof EtherscanLikeNormalTransaction.attributesList[number],
  string
>

export default EtherscanLikeNormalTransaction;
