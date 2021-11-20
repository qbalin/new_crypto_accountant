import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig, SupportedBlockchain } from '../config_types';
import EtherscanLikeNormalTransaction from '../models/etherscan_like/etherscan_like_normal_transaction';
import EtherscanLikeInternalTransaction from '../models/etherscan_like/etherscan_like_internal_transaction';
import EtherscanLikeTokenTransaction from '../models/etherscan_like/etherscan_like_token_transaction';
import EtherscanClient from '../api_clients/etherscan';
import FetchingStrategies from '../models/fetching_strategies';

const all = async <T>({
  accountIndentifier, walletAddress, apiClient, Model, fetchAction,
}:
  {
    accountIndentifier: string,
    walletAddress: string,
    apiClient: EtherscanClient,
    Model: {
      new ({ attributes } : {
        attributes: Record<string, any>,
        chain: SupportedBlockchain
      }): T,
    },
    fetchAction: string
  }) : Promise<T[]> => {
  const transactions = await FetchingStrategies.ETHERSCAN_LIKE.diskNetwork({
    accountIndentifier,
    walletAddress,
    action: fetchAction,
    apiClient,
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
      etherscanLikeApiKey: config.blockchainExplorerApiKey,
      infuraApiKey: config.nodeProviderApiKey,
    });
  }

  async retrieveData() {
    const normalTransactions = await all({
      Model: EtherscanLikeNormalTransaction,
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.etherscanClient,
      fetchAction: 'txlist',
    });
    const internalTransactions = await all({
      Model: EtherscanLikeInternalTransaction,
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.etherscanClient,
      fetchAction: 'txlistinternal',
    });
    const tokenTransactions = await all({
      Model: EtherscanLikeTokenTransaction,
      accountIndentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.etherscanClient,
      fetchAction: 'tokentx',
    });

    return [...normalTransactions, ...internalTransactions, ...tokenTransactions]
      .flatMap((t) => t.toAtomicTransactions());
  }

  static parseTransactions({ transactions }: {transactions: EtherscanLikeNormalTransaction[] }) {
    transactions.filter((t) => t.success);
  }
}

export default EthereumAccount;
