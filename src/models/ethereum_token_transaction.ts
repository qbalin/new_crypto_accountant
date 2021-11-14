/* eslint-disable no-use-before-define */
import EtherscanClient from '../api_clients/etherscan';
import FetchingStrategies from './fetching_strategies';

class EthereumTokenTransaction {
  private attributes: Attributes

  static attributesList = ['blockNumber', 'timeStamp', 'hash', 'nonce', 'blockHash', 'from', 'contractAddress', 'to', 'value', 'tokenName', 'tokenSymbol', 'tokenDecimal', 'transactionIndex', 'gas', 'gasPrice', 'gasUsed', 'cumulativeGasUsed', 'input', 'confirmations'] as const;

  static all = async ({ accountIndentifier, walletAddress, blockchainExplorerClient }:
    {
      accountIndentifier: string,
      walletAddress: string,
      blockchainExplorerClient: EtherscanClient
    }) => FetchingStrategies.ETHERSCAN_LIKE.cacheDiskNetwork({
    accountIndentifier,
    walletAddress,
    blockchainExplorerClient,
    action: 'tokentx',
    Model: this,
  })

  constructor({ attributes }: { attributes: Record<string, any> }) {
    EthereumTokenTransaction.attributesList.forEach((attribute) => {
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

  get nonce() {
    return this.attributes.nonce;
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

  get tokenName() {
    return this.attributes.tokenName;
  }

  get tokenSymbol() {
    return this.attributes.tokenSymbol.toUpperCase();
  }

  get tokenDecimal() {
    return parseInt(this.attributes.tokenDecimal, 10);
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
}

export type Attributes = Record<
  typeof EthereumTokenTransaction.attributesList[number],
  string
>

export default EthereumTokenTransaction;
