import DecentralizedAccount from './decentralized_account';
import type { DecentralizedAccountConfig } from '../config_types';
import EtherscanClient from '../api_clients/etherscan';
import EthereumTransaction from '../models/ethereum_transaction';
import EthereumInternalTransaction from '../models/ethereum_internal_transaction';
import EthereumTokenTransaction from '../models/ethereum_token_transaction';

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
    console.log('-------------------', await EthereumTransaction.all({ accountIndentifier: this.identifier, walletAddress: this.walletAddress, blockchainExplorerClient: this.etherscanClient }));
    console.log('-------------------', await EthereumInternalTransaction.all({ accountIndentifier: this.identifier, walletAddress: this.walletAddress, blockchainExplorerClient: this.etherscanClient }));
    console.log('-------------------', await EthereumTokenTransaction.all({ accountIndentifier: this.identifier, walletAddress: this.walletAddress, blockchainExplorerClient: this.etherscanClient }));
  }
}

export default EthereumAccount;
