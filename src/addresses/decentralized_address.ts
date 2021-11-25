import { SupportedBlockchain } from '../config_types';
import Address from './address';

// eslint-disable-next-line no-use-before-define
const instances: Record<string, DecentralizedAddress> = {};

class DecentralizedAddress extends Address {
  readonly address: string;

  readonly chain: SupportedBlockchain;

  readonly controlled: boolean;

  static getInstance({ address, chain, controlled = false }:
    { address: string, chain: SupportedBlockchain, controlled?: boolean }) {
    const newInstance = new this({ address, chain, controlled });
    const identifier = newInstance.toString();

    if (instances[identifier]) {
      return instances[identifier];
    }
    instances[identifier] = newInstance;
    return newInstance;
  }

  private constructor({ address, chain, controlled }:
    { address: string, chain: SupportedBlockchain, controlled: boolean }) {
    super();
    const lowerCasedAddress = address.toLowerCase();

    this.address = lowerCasedAddress;
    this.chain = chain;
    this.controlled = controlled;
  }

  toString() {
    return `${this.chain}-${this.address}`;
  }
}

export default DecentralizedAddress;
