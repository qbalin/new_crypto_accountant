/* eslint-disable no-use-before-define */
import EthereumLikeAddress from '../../addresses/ethereum_like_address';
import { SupportedBlockchain } from '../../config_types';
import chainToCoinMap from '../../currencies';
import AtomicTransaction from '../atomic_transaction';
import { ToJsonable, ToAtomicTransactionable, TransactionBundlable } from '../model_types';
import TransactionBundle, { BundleStatus } from '../transaction_bundle';

class EtherscanLikeInternalTransaction implements
  ToJsonable, ToAtomicTransactionable, TransactionBundlable {
  private readonly attributes: Attributes

  readonly chain: SupportedBlockchain;

  static readonly attributesList = ['blockNumber', 'timeStamp', 'hash', 'from', 'to', 'value', 'contractAddress', 'input', 'type', 'gas', 'gasUsed', 'traceId', 'isError', 'errCode'] as const;

  private atomicTransactions: AtomicTransaction[] | null;

  constructor(
    { attributes, chain } : { attributes: Record<string, any>, chain: SupportedBlockchain },
  ) {
    EtherscanLikeInternalTransaction.attributesList.forEach((attribute) => {
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

  get input() {
    return this.attributes.input;
  }

  get contractAddress() {
    return this.attributes.contractAddress.toLowerCase();
  }

  get gasUsed() {
    return parseInt(this.attributes.gasUsed, 10);
  }

  get type() {
    return this.attributes.type;
  }

  get traceId() {
    return this.attributes.type;
  }

  get errCode() {
    return this.attributes.errCode;
  }

  toJson() {
    return this.attributes;
  }

  transactionBundle() {
    return new TransactionBundle({ atomicTransactions: this.toAtomicTransactions(), action: '', status: BundleStatus.incomplete });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    this.atomicTransactions = [
      new AtomicTransaction({
        createdAt: this.timeStamp,
        action: '---------',
        currency: chainToCoinMap[this.chain],
        from: new EthereumLikeAddress({
          address: this.from,
          chain: this.chain,
        }),
        to: new EthereumLikeAddress({
          address: this.to,
          chain: this.chain,
        }),
        amount: this.amount,
        bundleId: this.hash,
      }),
    ];
    return this.atomicTransactions;
  }
}

export type Attributes = Record<
  typeof EtherscanLikeInternalTransaction.attributesList[number],
  string
>

export default EtherscanLikeInternalTransaction;
