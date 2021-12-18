import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig, SupportedBlockchain } from '../config_types';
import EtherscanLikeNormalTransaction from '../models/etherscan_like/etherscan_like_normal_transaction';
import EtherscanLikeInternalTransaction from '../models/etherscan_like/etherscan_like_internal_transaction';
import EtherscanLikeTokenTransaction from '../models/etherscan_like/etherscan_like_token_transaction';
import EtherscanClient from '../api_clients/etherscan';
import FetchingStrategies from '../models/fetching_strategies';
import EthereumLikeAddress from '../addresses/ethereum_like_address';
import { groupBy } from '../utils';
import TransactionBundle, { BundleAction, BundleStatus } from '../models/transaction_bundle';

const all = async <T>({
  accountIdentifier, walletAddress, apiClient, Model, fetchAction,
}:
  {
    accountIdentifier: string,
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
    accountIdentifier,
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
    const address = EthereumLikeAddress.getInstance({
      address: config.walletAddress,
      chain: config.blockchainName,
      controlled: true,
    });
    super({ ...config, address });
    this.nickname = config.nickname;
    this.etherscanClient = new EtherscanClient({
      etherscanLikeApiKey: config.blockchainExplorerApiKey,
      infuraApiKey: config.nodeProviderApiKey,
    });
  }

  async retrieveData() {
    const normalTransactions = await all({
      Model: EtherscanLikeNormalTransaction,
      accountIdentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.etherscanClient,
      fetchAction: 'txlist',
    });
    const internalTransactions = await all({
      Model: EtherscanLikeInternalTransaction,
      accountIdentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.etherscanClient,
      fetchAction: 'txlistinternal',
    });
    const tokenTransactions = await all({
      Model: EtherscanLikeTokenTransaction,
      accountIdentifier: this.identifier,
      walletAddress: this.walletAddress,
      apiClient: this.etherscanClient,
      fetchAction: 'tokentx',
    });

    const nonEmptyBundles = [...normalTransactions, ...internalTransactions, ...tokenTransactions]
      .map((t) => t.transactionBundle())
      .filter((b) => b.atomicTransactions.length !== 0)
      .filter((b) => !b.atomicTransactions.every((t) => t.amount === 0));

    const bundlesGroupedById = groupBy(nonEmptyBundles, (bundle) => bundle.id);
    return Object.entries(bundlesGroupedById).map(([id, bundlesGrouped]) => new TransactionBundle({
      id,
      action: BundleAction.toBeDetermined,
      status: BundleStatus.incomplete,
      atomicTransactions: bundlesGrouped.flatMap((bundle) => bundle.atomicTransactions),
    }));
  }

  static parseTransactions({ transactions }: {transactions: EtherscanLikeNormalTransaction[] }) {
    transactions.filter((t) => t.success);
  }
}

export default EthereumAccount;
