/* eslint-disable no-use-before-define */
import AtomicTransaction from '../atomic_transaction';
import { SupportedBlockchain } from '../../config_types';

class EtherscanLikeNormalTransaction {
  private readonly attributes: Attributes

  readonly chain: SupportedBlockchain;

  static readonly attributesList = ['blockNumber', 'timeStamp', 'hash', 'nonce', 'blockHash', 'transactionIndex', 'from', 'to', 'value', 'gas', 'gasPrice', 'isError', 'txreceipt_status', 'input', 'contractAddress', 'cumulativeGasUsed', 'gasUsed', 'confirmations'] as const;

  static readonly fetchAction = 'txlist'

  constructor(
    { attributes, chain } : { attributes: Record<string, any>, chain: SupportedBlockchain },
  ) {
    EtherscanLikeNormalTransaction.attributesList.forEach((attribute) => {
      if (!Object.keys(attributes).includes(attribute)) {
        throw new Error(`expected to find ${attribute} in ${Object.keys(attributes)}`);
      }
    });
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

  get value() {
    return parseInt(this.attributes.value, 10);
  }

  get gas() {
    return parseInt(this.attributes.gas, 10);
  }

  get gasPrice() {
    return parseInt(this.attributes.gasPrice, 10);
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

  get gasUsed() {
    return parseInt(this.attributes.gasUsed, 10);
  }

  get confirmations() {
    return parseInt(this.attributes.confirmations, 10);
  }

  toJson() {
    return this.attributes;
  }

  toAtomicTransactions() {
    return [
      new AtomicTransaction({
        createdAt: this.timeStamp,
        action: '-----',
        currency: 'ETH',
        from: this.from,
        to: this.to,
        transactionHash: this.hash,
        dataSource: 'plop',
        chain: this.chain,
      }),
    ];
  }
  // {
  //   createdAt: new Date(entry.timeStamp * 1000).toISOString(),
  //   bundleId: entry.hash.toLowerCase(),
  //   action: '----------',
  //   currency: this.coin,
  //   from: entry.from.toLowerCase(),
  //   amount: entry.value * 10 ** -18,
  //   to: entry.to.toLowerCase(),
  //   transactionHash: entry.hash.toLowerCase(),
  //   dataSource: 'explorer',
  //   chain: this.chain,
  //   contractAddress: entry.to.toLowerCase(),
  //   input: entry.input,
  // },
  // {
  //   createdAt: new Date(entry.timeStamp * 1000).toISOString(),
  //   bundleId: entry.hash.toLowerCase(),
  //   action: 'PAY_FEE',
  //   currency: this.coin,
  //   from: entry.from.toLowerCase(),
  //   amount: entry.gasUsed * entry.gasPrice * 10 ** -18,
  //   to: `_${this.coin} miner`,
  //   transactionHash: entry.hash.toLowerCase(),
  //   dataSource: 'explorer',
  //   chain: this.chain,
  // }

  // }
}

export type Attributes = Record<
  typeof EtherscanLikeNormalTransaction.attributesList[number],
  string
>

export default EtherscanLikeNormalTransaction;
