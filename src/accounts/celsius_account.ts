import { CentralizedAccountConfig } from '../config_types';
import CentralizedAccount from './centralized_account';
import FetchingStrategies from '../models/fetching_strategies';
import CelsiusRecord from '../models/celsius/record';

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

  async retrieveData() {
    const records = await FetchingStrategies.CELSIUS.disk();
    return records
      .map((attributes) => new CelsiusRecord({ attributes, accountNickname: this.nickname }));
  }
}

export default CelsiusAccount;
