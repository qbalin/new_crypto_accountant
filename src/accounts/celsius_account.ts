import { CentralizedAccountConfig } from '../config_types';
import CentralizedAccount from './centralized_account';
import FetchingStrategies from '../models/fetching_strategies';

class CelsiusAccount extends CentralizedAccount {
  // private readonly coinbaseClient: CoinbaseClient;

  constructor(config: CentralizedAccountConfig) {
    super({ nickname: config.nickname, platform: config.platformName });
    // this.coinbaseClient = new CoinbaseClient({
    //   secret: config.privateApiSecret,
    //   apiKey: config.privateApiKey,
    //   apiPassphrase: config.privateApiPassphrase,
    // });
  }

  // eslint-disable-next-line class-methods-use-this
  async retrieveData() {
    const records = await FetchingStrategies.CELSIUS.disk();
    console.log('Celsius', JSON.stringify(records, null, 2));
    return [];
  }
}

export default CelsiusAccount;
