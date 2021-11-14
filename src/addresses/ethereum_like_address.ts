import { SupportedBlockchain } from '../config_types';

class EthereumLikeAddress {
  readonly address: string;

  readonly chain: SupportedBlockchain;

  constructor({ address, chain }: { address: string, chain: SupportedBlockchain }) {
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
  }
}

export default EthereumLikeAddress;
