import { CentralizedAccountConfig } from '../config_types';
import CentralizedAccount from './centralized_account';
import CoinbaseClient from '../api_clients/coinbase';
import FetchingStrategies from '../models/fetching_strategies';
import Account from '../models/coinbase/account';
import Fill from '../models/coinbase/fill';
import Transfer from '../models/coinbase/transfer';
import Product from '../models/coinbase/product';
import Conversion from '../models/coinbase/conversion';

const all = async <T>({
  accountIdentifier,
  apiClient,
  Model,
  iterationParams,
  fetchAction,
  nickname,
  accountIdToCurrencyMap = {},
}:
  {
    accountIdentifier: string,
    apiClient: CoinbaseClient,
    Model: {
      new ({ attributes } : {
        attributes: Record<string, any>,
        accountNickname: string,
        accountIdToCurrencyMap: Record<string, string>
      }): T
    },
    iterationParams?: { key: string, values: string[] },
    fetchAction: string,
    nickname: string,
    accountIdToCurrencyMap?: Record<string, string>
  }) : Promise<T[]> => {
  let records;
  if (['fills', 'transfers'].includes(fetchAction)) {
    records = await FetchingStrategies.COINBASE.diskForTimedRecords({
      accountIdentifier,
      action: fetchAction,
      apiClient,
      iterationParams,
    });
  } else {
    records = await FetchingStrategies.COINBASE.diskNetworkForTimelessRecords({
      accountIdentifier,
      action: fetchAction,
      apiClient,
    });
  }

  return records.map((attributes) => new Model({
    attributes,
    accountNickname: nickname,
    accountIdToCurrencyMap,
  }));
};

class CoinbaseAccount extends CentralizedAccount {
  private readonly coinbaseClient: CoinbaseClient;

  constructor(config: CentralizedAccountConfig) {
    super({ nickname: config.nickname, platform: config.platformName });
    this.coinbaseClient = new CoinbaseClient({
      secret: config.privateApiSecret,
      apiKey: config.privateApiKey,
      apiPassphrase: config.privateApiPassphrase,
    });
  }

  async retrieveData() {
    const accounts = await all({
      accountIdentifier: this.identifier,
      apiClient: this.coinbaseClient,
      nickname: this.nickname,
      Model: Account,
      fetchAction: 'accounts',
    });
    const accountIdToCurrencyMap = accounts.reduce<Record<string, string>>((memo, account) => {
      // eslint-disable-next-line no-param-reassign
      memo[account.id] = account.currency;
      return memo;
    }, {});
    const usdcAccountId = accounts.find((a) => a.currency === 'USDC')?.id;
    const usdcLedger = await this.coinbaseClient.call({ requestPath: `/accounts/${usdcAccountId}/ledger` });
    const conversionsJson = usdcLedger.filter((entry: { type: string }) => entry.type === 'conversion');
    const conversions: Conversion[] = conversionsJson
      .map((attributes: Record<string, any>) => new Conversion({
        attributes,
        accountNickname: this.nickname,
      }));

    const products = await all({
      accountIdentifier: this.identifier,
      apiClient: this.coinbaseClient,
      nickname: this.nickname,
      Model: Product,
      fetchAction: 'products',
    });
    const fills = await all({
      accountIdentifier: this.identifier,
      apiClient: this.coinbaseClient,
      nickname: this.nickname,
      Model: Fill,
      fetchAction: 'fills',
      iterationParams: {
        key: 'product_id',
        values: products.map((p) => p.id),
      },
    });
    const transfers = await all({
      accountIdentifier: this.identifier,
      apiClient: this.coinbaseClient,
      nickname: this.nickname,
      Model: Transfer,
      fetchAction: 'transfers',
      accountIdToCurrencyMap,
    });

    return [...fills, ...transfers, ...conversions]
      .map((obj) => obj.transactionBundle())
      .filter((bundle) => !bundle.isEmpty);
  }
}

export default CoinbaseAccount;
