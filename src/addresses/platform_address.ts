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
}

export default PlatformAddress;
