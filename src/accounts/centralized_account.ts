import Account from './account';
import { SupportedPlatform } from '../config_types';

abstract class CentralizedAccount extends Account {
    readonly nickname: string;

    readonly platform: SupportedPlatform;

    constructor({ nickname, platform }:
         {nickname: string, platform: SupportedPlatform}) {
      super();
      this.nickname = nickname;
      this.platform = platform;
    }

    get identifier() {
      return `${this.platform}-${this.nickname}`;
    }
}

export default CentralizedAccount;
