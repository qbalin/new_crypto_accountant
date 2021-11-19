import { SupportedPlatform } from '../config_types';
import Address from './address';

class PlatformAddress extends Address {
  readonly platform: SupportedPlatform;

  readonly nickname: string;

  constructor({ platform, nickname }: { platform: SupportedPlatform, nickname: string}) {
    super();
    this.platform = platform;
    this.nickname = nickname;
  }

  toString() {
    return `${this.platform}-${this.nickname}`;
  }
}

export default PlatformAddress;
