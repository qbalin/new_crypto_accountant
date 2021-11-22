/* eslint-disable no-use-before-define */
import { SupportedBlockchain } from '../../config_types';
import AtomicTransaction from '../atomic_transaction';
import EthereumLikeAddress from '../../addresses/ethereum_like_address';
import TransactionBundle, { BundleStatus } from '../transaction_bundle';
import { ToJsonable, ToAtomicTransactionable, TransactionBundlable } from '../model_types';

class EtherscanLikeTokenTransaction implements
  ToJsonable, ToAtomicTransactionable, TransactionBundlable {
  private readonly attributes: Attributes

  readonly chain: SupportedBlockchain;

  static readonly attributesList = ['blockNumber', 'timeStamp', 'hash', 'nonce', 'blockHash', 'from', 'contractAddress', 'to', 'value', 'tokenName', 'tokenSymbol', 'tokenDecimal', 'transactionIndex', 'gas', 'gasPrice', 'gasUsed', 'cumulativeGasUsed', 'input', 'confirmations'] as const;

  private atomicTransactions: AtomicTransaction[] | null;

  constructor(
    { attributes, chain } : { attributes: Record<string, any>, chain: SupportedBlockchain },
  ) {
    EtherscanLikeTokenTransaction.attributesList.forEach((attribute) => {
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

  get from() {
    return this.attributes.from.toLowerCase();
  }

  get to() {
    return this.attributes.to.toLowerCase();
  }

  get amount() {
    return parseInt(this.attributes.value, 10)
    * 10 ** (-1 * parseInt(this.attributes.tokenDecimal, 10));
  }

  get tokenName() {
    return this.attributes.tokenName;
  }

  get tokenSymbol() {
    return this.attributes.tokenSymbol.toUpperCase();
  }

  get transactionIndex() {
    return this.attributes.transactionIndex;
  }

  get gas() {
    return parseInt(this.attributes.gas, 10);
  }

  get gasPrice() {
    return parseInt(this.attributes.gasPrice, 10);
  }

  get gasUsed() {
    return parseInt(this.attributes.gasUsed, 10);
  }

  get cumulativeGasUsed() {
    return parseInt(this.attributes.cumulativeGasUsed, 10);
  }

  get input() {
    return this.attributes.input;
  }

  get contractAddress() {
    return this.attributes.contractAddress.toLowerCase();
  }

  get confirmations() {
    return parseInt(this.attributes.confirmations, 10);
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
      // Never take into account the fees from an erc20 token transaction:
      // A normal transaction will bear the fees, that's where we get them from.
      // A normal transaction can contain several erc20 token transactions, we don't
      // want to count the fees multiple times. E.g.:
      // https://polygonscan.com/tx/0x2d86c15bad5bc03dd43d06bd97c2ec389fbf400f38f2189eb92a6441327f721d
      new AtomicTransaction({
        createdAt: this.timeStamp,
        action: '-----',
        currency: this.tokenSymbol,
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
  typeof EtherscanLikeTokenTransaction.attributesList[number],
  string
>

export default EtherscanLikeTokenTransaction;
