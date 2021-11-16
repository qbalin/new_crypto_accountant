import { CentralizedAccountConfig, SupportedPlatform } from '../config_types';
import Account from './account';
import CoinbaseClient from '../api_clients/coinbase';

class CoinbaseAccount extends Account {
  readonly nickname: string;

  readonly platformName: SupportedPlatform

  private readonly coinbaseClient: CoinbaseClient;

  constructor(config: CentralizedAccountConfig) {
    super();
    this.nickname = config.nickname;
    this.platformName = config.platformName;
    this.coinbaseClient = new CoinbaseClient({
      secret: config.privateApiSecret,
      apiKey: config.privateApiKey,
      apiPassphrase: config.privateApiPassphrase,
    });
  }

  async fetch() {
    const accounts = await this.coinbaseClient.call({ requestPath: '/accounts' });
    const productIds = (await this.coinbaseClient.call({ requestPath: '/products' })).map((p: { id: string}) => p.id);
    let fills = Promise.resolve([]);
    productIds.map(async (productId: string) => {
      fills = fills.then(async (result) => result.concat(await this.coinbaseClient.call({ requestPath: `/fills?product_id=${productId}` })));
    });
    const transfers = await this.coinbaseClient.call({ requestPath: '/transfers' });

    console.log(accounts);
    console.log(productIds);
    console.log(fills);
    console.log(transfers);
  }
}

export default CoinbaseAccount;
