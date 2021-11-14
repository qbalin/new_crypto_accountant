import DecentralizedAccount from './decentralized_account';
import type { DecentralizedAccountConfig } from '../config_types';
import EtherscanClient from '../api_clients/etherscan';
import EtherscanLikeTransaction from '../models/etherscan_like_transaction';
import EtherscanLikeInternalTransaction from '../models/etherscan_like_internal_transaction';
import EtherscanLikeTokenTransaction from '../models/etherscan_like_token_transaction';

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
    await EtherscanLikeTransaction.all({
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.etherscanClient,
    });
    await EtherscanLikeInternalTransaction.all({
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.etherscanClient,
    });
    await EtherscanLikeTokenTransaction.all({
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.etherscanClient,
    });
  }
}

export default EthereumAccount;
