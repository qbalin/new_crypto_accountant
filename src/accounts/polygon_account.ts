import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig, SupportedBlockchain } from '../config_types';
import EtherscanLikeNormalTransaction from '../models/etherscan_like/etherscan_like_normal_transaction';
import EtherscanLikeInternalTransaction from '../models/etherscan_like/etherscan_like_internal_transaction';
import EtherscanLikeTokenTransaction from '../models/etherscan_like/etherscan_like_token_transaction';
import PolygonscanClient from '../api_clients/polygonscan';
import FetchingStrategies from '../models/fetching_strategies';
import EthereumLikeAddress from '../addresses/ethereum_like_address';

const all = async <T>({
  accountIdentifier, walletAddress, apiClient, Model, fetchAction,
}:
  {
    accountIdentifier: string,
    walletAddress: string,
    apiClient: PolygonscanClient,
    Model: {
      new ({ attributes } : {
        attributes: Record<string, any>,
        chain: SupportedBlockchain
      }): T,
    },
    fetchAction: string
  }) : Promise<T[]> => {
  const transactions = await FetchingStrategies.ETHERSCAN_LIKE.diskNetwork({
    accountIdentifier,
    walletAddress,
    action: fetchAction,
    apiClient,
  });

  return transactions.map((attributes) => new Model({
    attributes,
    chain: SupportedBlockchain.Polygon,
  }));
};

class EthereumAccount extends DecentralizedAccount {
  readonly nickname: string

  readonly polygonscanClient: PolygonscanClient;

  constructor(config: DecentralizedAccountConfig) {
    const address = EthereumLikeAddress.getInstance({
      address: config.walletAddress,
      chain: config.blockchainName,
      controlled: true,
    });
    super({ ...config, address });
    this.nickname = config.nickname;
    this.polygonscanClient = new PolygonscanClient({
      etherscanLikeApiKey: config.blockchainExplorerApiKey,
      infuraApiKey: config.nodeProviderApiKey,
    });
  }

  async retrieveData() {
    const normalTransactions = await all({
      Model: EtherscanLikeNormalTransaction,
      accountIdentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.polygonscanClient,
      fetchAction: 'txlist',
    });
    const internalTransactions = await all({
      Model: EtherscanLikeInternalTransaction,
      accountIdentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.polygonscanClient,
      fetchAction: 'txlistinternal',
    });
    const tokenTransactions = await all({
      Model: EtherscanLikeTokenTransaction,
      accountIdentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.polygonscanClient,
      fetchAction: 'tokentx',
    });

    return [...normalTransactions, ...internalTransactions, ...tokenTransactions];
  }

  static parseTransactions({ transactions }: {transactions: EtherscanLikeNormalTransaction[] }) {
    transactions.filter((t) => t.success);
  }
}

export default EthereumAccount;
