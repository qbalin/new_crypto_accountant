import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig, SupportedBlockchain } from '../config_types';
import EtherscanLikeNormalTransaction from '../models/etherscan_like/etherscan_like_normal_transaction';
import EtherscanLikeInternalTransaction from '../models/etherscan_like/etherscan_like_internal_transaction';
import EtherscanLikeTokenTransaction from '../models/etherscan_like/etherscan_like_token_transaction';
import EtherscanClient from '../api_clients/etherscan';
import FetchingStrategies from '../models/fetching_strategies';

const all = async <T>({
  accountIndentifier, walletAddress, blockchainExplorerClient, Model,
}:
  {
    accountIndentifier: string,
    walletAddress: string,
    blockchainExplorerClient: EtherscanClient,
    Model: {
      new ({ attributes } : {
        attributes: Record<string, any>,
        chain: SupportedBlockchain
      }): T,
      fetchAction: string
    },
  }) : Promise<T[]> => {
  const transactions = await FetchingStrategies.ETHERSCAN_LIKE.diskNetwork({
    accountIndentifier,
    walletAddress,
    action: Model.fetchAction,
    blockchainExplorerClient,
  });

  return transactions.map((attributes) => new Model({
    attributes,
    chain: SupportedBlockchain.Ethereum,
  }));
};

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
    await all({
      Model: EtherscanLikeNormalTransaction,
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.etherscanClient,
    });
    await all({
      Model: EtherscanLikeInternalTransaction,
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.etherscanClient,
    });
    await all({
      Model: EtherscanLikeTokenTransaction,
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      blockchainExplorerClient: this.etherscanClient,
    });
  }

  static parseTransactions({ transactions }: {transactions: EtherscanLikeNormalTransaction[] }) {
    transactions.filter((t) => t.success);
  }
}

export default EthereumAccount;
