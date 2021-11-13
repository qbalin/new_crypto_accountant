/* eslint-disable camelcase */
import { EthereumTransactionAttributes as Attributes } from './attribute_types';
import EthereumAccount from '../accounts/ethereum_account';
import Loader from './loader';

class EthereumTransaction {
  private attributes: Attributes

  static attributesList = ['blockNumber', 'timeStamp', 'hash', 'nonce', 'blockHash', 'transactionIndex', 'from', 'to', 'value', 'gas', 'gasPrice', 'isError', 'txreceipt_status', 'input', 'contractAddress', 'cumulativeGasUsed', 'gasUsed', 'confirmations'] as const;

  static Loader = new Loader();

  static allForAccount = async (account: EthereumAccount) => {
    const transactions = this.Loader.load({ path: `./downloads/${account.identifier}-txlist.json`, Model: this });
    transactions.sort((a, b) => +a.timeStamp - +b.timeStamp);
    const firstTimeStamp = transactions[0]?.timeStamp || new Date();
    const lastTimeStamp = transactions[transactions.length - 1]?.timeStamp || new Date();

    const previousTransactions = (await account.etherscanClient.call({ requestPath: `?module=account&action=txlist&address=${account.walletAddress}`, until: new Date(+firstTimeStamp - 1) })).map((attributes) => { console.log('obk', attributes); return new this({ attributes }); });
    const laterTransactions = (await account.etherscanClient.call({ requestPath: `?module=account&action=txlist&address=${account.walletAddress}`, since: new Date(+lastTimeStamp + 1) })).map((attributes) => { console.log('obk', attributes); return new this({ attributes }); });

    const allTransactions = [...transactions, ...previousTransactions, ...laterTransactions];
    this.Loader.save({ path: `./downloads/${account.identifier}-txlist.json`, collection: allTransactions });
    return allTransactions;
  }

  constructor({ attributes }: Record<string, any>) {
    EthereumTransaction.attributesList.forEach((attribute) => {
      if (!Object.keys(attributes).includes(attribute)) {
        throw new Error(`expected to find ${attribute} in ${Object.keys(attributes)}`);
      }
    });
    this.attributes = attributes as Attributes;
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
