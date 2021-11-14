/* eslint-disable no-use-before-define */
import EtherscanClient from '../api_clients/etherscan';
import FetchingStrategies from './fetching_strategies';

class EthereumInternalTransaction {
  private attributes: Attributes

  static attributesList = ['blockNumber', 'timeStamp', 'hash', 'from', 'to', 'value', 'contractAddress', 'input', 'type', 'gas', 'gasUsed', 'traceId', 'isError', 'errCode'] as const;

  static all = async ({ accountIndentifier, walletAddress, blockchainExplorerClient }:
    {
      accountIndentifier: string,
      walletAddress: string,
      blockchainExplorerClient: EtherscanClient
    }) => FetchingStrategies.ETHERSCAN_LIKE.cacheDiskNetwork({
    accountIndentifier,
    walletAddress,
    blockchainExplorerClient,
    action: 'txlistinternal',
    Model: this,
  })

  constructor({ attributes }: { attributes: Record<string, any> }) {
    EthereumInternalTransaction.attributesList.forEach((attribute) => {
      if (!Object.keys(attributes).includes(attribute)) {
        throw new Error(`expected to find ${attribute} in ${Object.keys(attributes)}`);
      }
    });
    this.attributes = attributes as Attributes;
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

  get value() {
    return parseInt(this.attributes.value, 10);
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
    return this.attributes.gasUsed;
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
}

export type Attributes = Record<
  typeof EthereumInternalTransaction.attributesList[number],
  string
>

export default EthereumInternalTransaction;
