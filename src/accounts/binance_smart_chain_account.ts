import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig, SupportedBlockchain } from '../config_types';
import EtherscanLikeNormalTransaction from '../models/etherscan_like/etherscan_like_normal_transaction';
import EtherscanLikeInternalTransaction from '../models/etherscan_like/etherscan_like_internal_transaction';
import EtherscanLikeTokenTransaction from '../models/etherscan_like/etherscan_like_token_transaction';
import BscscanClient from '../api_clients/bscscan';
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
    apiClient: BscscanClient,
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
    chain: SupportedBlockchain.BinanceSmartChain,
  }));
};

class BinanceSmartChainAccount extends DecentralizedAccount {
  readonly nickname: string

  readonly etherscanClient: BscscanClient;

  constructor(config: DecentralizedAccountConfig) {
    const address = EthereumLikeAddress.getInstance({
      address: config.walletAddress,
      chain: config.blockchainName,
      controlled: true,
    });
    super({ ...config, address });
    this.nickname = config.nickname;
    this.etherscanClient = new BscscanClient({
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
      .filter((bundle) => !bundle.isEmpty);

    const bundlesGroupedById = groupBy(nonEmptyBundles, (bundle) => bundle.id);
    return Object.entries(bundlesGroupedById).map(([id, bundlesGrouped]) => {
      if (bundlesGrouped.length === 1) {
        const singleBundle = bundlesGrouped[0];
        if (singleBundle.isPureFee) {
          return new TransactionBundle({
            id,
            action: BundleAction.pureFeePayment,
            status: BundleStatus.complete,
            atomicTransactions: singleBundle.atomicTransactions,
          });
        }
        return singleBundle;
      }
      return new TransactionBundle({
        id,
        action: BundleAction.toBeDetermined,
        status: BundleStatus.incomplete,
        atomicTransactions: bundlesGrouped.flatMap((bundle) => bundle.atomicTransactions),
      });
    });
  }

  static parseTransactions({ transactions }: {transactions: EtherscanLikeNormalTransaction[] }) {
    transactions.filter((t) => t.success);
  }
}

export default BinanceSmartChainAccount;
