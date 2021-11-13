import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig } from '../config';
import EtherscanClient from '../api_clients/etherscan';
import EthereumTransaction from '../models/ethereum_transaction';
import ModelLoader from '../models/loader';

class EthereumAccount extends DecentralizedAccount {
  readonly nickname: string

  readonly etherscanClient: EtherscanClient;

  private static readonly Loader = new ModelLoader();

  private static readonly recordTypes = {
    txlist: EthereumTransaction,
  }

  transations: { timeStamp: string; }[];

  constructor(config: DecentralizedAccountConfig) {
    super(config);
    this.nickname = config.nickname;
    this.etherscanClient = new EtherscanClient({
      etherscanApiKey: config.blockchainExplorerApiKey,
      infuraApiKey: config.nodeProviderApiKey,
    });
    this.transations = [];
  }

  async fetch() : Promise<void> {
    Object.entries(EthereumAccount.recordTypes).forEach(async ([key, Model]) => {
      const transactions = EthereumAccount.Loader.load({ path: `./downloads/${this.identifier}-${key}.json`, Model });
      transactions.sort((a, b) => +a.timeStamp - +b.timeStamp);
      const firstTimeStamp = transactions[0]?.timeStamp || new Date();
      const lastTimeStamp = transactions[transactions.length - 1]?.timeStamp || new Date();

      const previousTransactions = (await this.etherscanClient.call({ requestPath: `?module=account&action=txlist&address=${this.walletAddress}`, until: new Date(+firstTimeStamp - 1) })).map((obj) => new Model(obj));
      const laterTransactions = (await this.etherscanClient.call({ requestPath: `?module=account&action=txlist&address=${this.walletAddress}`, since: new Date(+lastTimeStamp + 1) })).map((obj) => new Model(obj));

      EthereumAccount.Loader.save({ path: `./downloads/${this.identifier}-${key}.json`, collection: [...transactions, ...previousTransactions, ...laterTransactions] });
    });
  }

  printTransactions() {
    console.log(this.transations);
  }
}

export default EthereumAccount;
