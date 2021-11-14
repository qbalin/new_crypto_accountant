import DecentralizedAccount from './decentralized_account';
import type { DecentralizedAccountConfig } from '../config_types';
import PolygonscanClient from '../api_clients/polygonscan';
import EtherscanLikeTransaction from '../models/etherscan_like_transaction';
import EtherscanLikeInternalTransaction from '../models/etherscan_like_internal_transaction';
import EtherscanLikeTokenTransaction from '../models/etherscan_like_token_transaction';

class EthereumAccount extends DecentralizedAccount {
  readonly nickname: string

  readonly polygonscanClient: PolygonscanClient;

  constructor(config: DecentralizedAccountConfig) {
    super(config);
    this.nickname = config.nickname;
    this.polygonscanClient = new PolygonscanClient({
      polygonscanApiKey: config.blockchainExplorerApiKey,
      infuraApiKey: config.nodeProviderApiKey,
    });
  }

  async fetch() : Promise<void> {
    await EtherscanLikeTransaction.all({
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.polygonscanClient,
    });
    await EtherscanLikeInternalTransaction.all({
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.polygonscanClient,
    });
    await EtherscanLikeTokenTransaction.all({
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.polygonscanClient,
    });
  }
}

export default EthereumAccount;
