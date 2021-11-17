import { CentralizedAccountConfig } from '../config_types';
import CentralizedAccount from './centralized_account';
import CoinbaseClient from '../api_clients/coinbase';
import FetchingStrategies from '../models/fetching_strategies';
import Account from '../models/coinbase/account';
import Fill from '../models/coinbase/fill';
import Transfer from '../models/coinbase/transfer';
import Product from '../models/coinbase/product';

const all = async <T>({
  accountIndentifier, apiClient, Model, iterationParams, fetchAction,
}:
  {
    accountIndentifier: string,
    apiClient: CoinbaseClient,
    Model: {
      new ({ attributes } : {
        attributes: Record<string, any>
      }): T
    },
    iterationParams?: { key: string, values: string[] },
    fetchAction: string
  }) : Promise<T[]> => {
  let records;
  if (['fills', 'transfers'].includes(fetchAction)) {
    records = await FetchingStrategies.COINBASE.diskNetworkForTimedRecords({
      accountIndentifier,
      action: fetchAction,
      apiClient,
      iterationParams,
    });
  } else {
    records = await FetchingStrategies.COINBASE.diskNetworkForTimelessRecords({
      accountIndentifier,
      action: fetchAction,
      apiClient,
    });
  }

  return records.map((attributes) => new Model({ attributes }));
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

  async fetch() {
    const accounts = await all({
      accountIndentifier: this.identifier,
      apiClient: this.coinbaseClient,
      Model: Account,
      fetchAction: 'accounts',
    });
    const products = await all({
      accountIndentifier: this.identifier,
      apiClient: this.coinbaseClient,
      Model: Product,
      fetchAction: 'products',
    });
    const fills = await all({
      accountIndentifier: this.identifier,
      apiClient: this.coinbaseClient,
      Model: Fill,
      fetchAction: 'fills',
      iterationParams: {
        key: 'product_id',
        values: products.map((p) => p.id),
      },
    });
    const transfers = await all({
      accountIndentifier: this.identifier,
      apiClient: this.coinbaseClient,
      Model: Transfer,
      fetchAction: 'transfers',
    });

    console.log(accounts);
    console.log(products.map((p) => p.id));
    console.log(fills);
    console.log(transfers);
  }
}

export default CoinbaseAccount;
