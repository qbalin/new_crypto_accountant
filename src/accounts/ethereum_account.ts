import Account from './account';
import { DecentralizedAccountConfig } from '../config';
import EtherscanClient from '../api_clients/etherscan';

class EthereumAccount extends Account {
  readonly nickname: string

  readonly walletAddress: string;

  readonly blockchainName: string;

  readonly etherscanClient: EtherscanClient;

  transations: { timeStamp: string; }[];

  constructor(config: DecentralizedAccountConfig) {
    super();
    this.nickname = config.nickname;
    this.walletAddress = config.walletAddress.toLowerCase();
    this.blockchainName = config.blockchainName.toLowerCase();
    this.etherscanClient = new EtherscanClient({
      etherscanApiKey: config.blockchainExplorerApiKey,
      infuraApiKey: config.nodeProviderApiKey,
    });
    this.transations = [];
  }

  async fetch() : Promise<void> {
    this.transations = await this.etherscanClient.call({ requestPath: `?module=account&action=txlist&address=${this.walletAddress}` });
  }

  printTransactions() {
    console.log(this.transations);
  }
}

export default EthereumAccount;
