import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig } from '../config_types';
import AlgorandClient from '../api_clients/algo_explorer';
import Transaction from '../models/algorand_algo_explorer/transaction';
import DecentralizedAddress from '../addresses/decentralized_address';
import FetchingStrategies from '../models/fetching_strategies';
import { uniq } from '../utils';
import Asset from '../models/algorand_algo_explorer/asset';

class AlgorandAccount extends DecentralizedAccount {
  readonly nickname: string

  constructor(config: DecentralizedAccountConfig) {
    const address = DecentralizedAddress.getInstance({
      address: config.walletAddress,
      chain: config.blockchainName,
      controlled: true,
    });
    super({ ...config, address });
    this.nickname = config.nickname;
  }

  async retrieveData() {
    const fetchTransactions = async ({ since }: {since: Date}) => AlgorandClient
      .getTransactions({ walletAddress: this.walletAddress, since });
    const rawTransactions = await FetchingStrategies.ALGORAND
      .diskNetworkForTransactions({
        fetchMethod: fetchTransactions,
        accountIdentifier: this.identifier,
      });

    const assetIds = uniq(rawTransactions
      .filter((rt) => rt['asset-transfer-transaction'])
      .map((rt) => rt['asset-transfer-transaction']['asset-id']));

    const fetchAssets = (ids: number[]) => AlgorandClient.getAssets({ assetIds: ids });
    const assets = (await FetchingStrategies.ALGORAND.diskNetworkForAssets({
      accountIdentifier: this.identifier,
      fetchMethod: fetchAssets,
      assetIdsToFetch: assetIds,
    })).map((attributes: Record<string, any>) => new Asset({ attributes }));

    const assetIndexToAssetMap = assets.reduce((memo, asset) => {
      // eslint-disable-next-line no-param-reassign
      memo[asset.index] = asset;
      return memo;
    }, {} as Record<string, Asset>);

    const transactions = rawTransactions.map((attributes: Record<string, any>) => new Transaction({
      attributes,
      assetIndexToAssetMap,
    }));

    return [...transactions];
  }
}

export default AlgorandAccount;
