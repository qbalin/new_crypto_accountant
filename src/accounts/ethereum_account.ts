import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig } from '../config';
import EtherscanClient from '../api_clients/etherscan';
import EthereumTransaction from '../models/ethereum_transaction';

class EthereumAccount extends DecentralizedAccount {
  readonly nickname: string

  readonly etherscanClient: EtherscanClient;

  constructor(config: DecentralizedAccountConfig) {
    super(config);
    this.nickname = config.nickname;
    this.etherscanClient = new EtherscanClient({
      etherscanApiKey: config.blockchainExplorerApiKey,
      infuraApiKey: config.nodeProviderApiKey,
    });
  }

  async fetch() : Promise<void> {
    const transaction = await EthereumTransaction.allForAccount(this);
    const internalTransaction = await EthereumInternalTransaction.allForAccount(this);
  }
}

export default EthereumAccount;
