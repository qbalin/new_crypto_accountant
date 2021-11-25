import { SupportedPlatform } from '../config_types';
import Address from './address';

// eslint-disable-next-line no-use-before-define
const instances: Record<string, PlatformAddress> = {};

class PlatformAddress extends Address {
  readonly platform: SupportedPlatform;

  readonly nickname: string;

  readonly controlled: boolean;

  static getInstance({ platform, nickname, controlled = false }:
    { platform: SupportedPlatform, nickname: string, controlled?: boolean}) {
    const newInstance = new this({ platform, nickname, controlled });
    const identifier = newInstance.toString();

    if (instances[identifier]) {
      return instances[identifier];
    }
    instances[identifier] = newInstance;
    return newInstance;
  }

  private constructor({ platform, nickname, controlled }:
    { platform: SupportedPlatform, nickname: string, controlled: boolean}) {
    super();
    this.platform = platform;
    this.nickname = nickname;
    this.controlled = controlled;
  }

  toString() {
    return `${this.platform}-${this.nickname}`;
  }
}

export default PlatformAddress;
