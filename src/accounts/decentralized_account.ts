import Account from './account';
import { SupportedBlockchain } from '../config_types';
import Address from '../addresses/address';

abstract class DecentralizedAccount extends Account {
    readonly walletAddress: string;

    readonly blockchainName: SupportedBlockchain;

    readonly address: Address;

    constructor({ walletAddress, blockchainName, address }:
         {walletAddress: string, blockchainName: SupportedBlockchain, address: Address}) {
      super();
      this.walletAddress = walletAddress.toLowerCase();
      this.blockchainName = blockchainName;
      this.address = address;
    }

    get identifier() {
      return `${this.blockchainName}-${this.walletAddress}`;
    }
}

export default DecentralizedAccount;
