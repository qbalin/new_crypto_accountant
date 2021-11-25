import Account from './account';
import { SupportedPlatform } from '../config_types';
import PlatformAddress from '../addresses/platform_address';

abstract class CentralizedAccount extends Account {
  readonly nickname: string;

  readonly platform: SupportedPlatform;

  readonly address: PlatformAddress;

  constructor({ nickname, platform }:
    { nickname: string, platform: SupportedPlatform }) {
    super();
    this.nickname = nickname;
    this.platform = platform;
    this.address = PlatformAddress.getInstance({ nickname, platform, controlled: true });
  }

  get identifier() {
    return `${this.platform}-${this.nickname}`;
  }
}

export default CentralizedAccount;
