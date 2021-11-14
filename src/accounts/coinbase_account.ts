import { CentralizedAccountConfig, SupportedPlatform } from '../config_types';
import Account from './account';

class CoinbaseAccount extends Account {
  readonly nickname: string;

  readonly platformName: SupportedPlatform

  readonly apiKey: string;

  constructor(config: CentralizedAccountConfig) {
    super();
    this.nickname = config.nickname;
    this.platformName = config.platformName;
    this.apiKey = config.privateApiKey;
  }

  async fetch() {
    return this;
  }
}

export default CoinbaseAccount;
