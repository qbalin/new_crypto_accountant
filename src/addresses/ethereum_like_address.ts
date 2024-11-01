import { SupportedBlockchain } from '../config_types';
import Address from './address';

// eslint-disable-next-line no-use-before-define
const instances: Record<string, EthereumLikeAddress> = {};

class EthereumLikeAddress extends Address {
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
    if (lowerCasedAddress.length !== 42) {
      throw new Error(`Ethereum-like addresses must have 42 characters, got: "${address}"`);
    }
    if (!lowerCasedAddress.startsWith('0x')) {
      throw new Error(`Ethereum-like addresses must start with "0x", got: "${address}"`);
    }
    if (/[^0-9a-f]/.test(lowerCasedAddress.slice(2))) {
      throw new Error(`Ethereum-like addresses must be hexadecimal numbers, got: "${address}"`);
    }
    this.address = lowerCasedAddress;
    this.chain = chain;
    this.controlled = controlled;
  }

  toString() {
    return `${this.chain}-${this.address}`;
  }
}

export default EthereumLikeAddress;
