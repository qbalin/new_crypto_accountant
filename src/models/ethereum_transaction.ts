/* eslint-disable camelcase */

export interface Attributes {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    nonce: string;
    blockHash: string;
    transactionIndex: string;
    from: string;
    to: string;
    value: string;
    gas: string;
    gasPrice: string;
    isError: string;
    txreceipt_status: string;
    input: string;
    contractAddress: string;
    cumulativeGasUsed: string;
    gasUsed: string;
    confirmations: string;
}

class EthereumTransaction {
  private attributes: Attributes

  constructor(attributes: Attributes) {
    this.attributes = attributes;
  }

  get blockNumber() {
    return this.attributes.blockNumber;
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

  get txreceipt_status() {
    return this.attributes.txreceipt_status;
  }

  get input() {
    return this.attributes.input;
  }

  get contractAddress() {
    return this.attributes.contractAddress;
  }

  get cumulativeGasUsed() {
    return this.attributes.cumulativeGasUsed;
  }

  get gasUsed() {
    return this.attributes.gasUsed;
  }

  get confirmations() {
    return this.attributes.confirmations;
  }

  toJson() {
    return this.attributes;
  }
}

export default EthereumTransaction;
