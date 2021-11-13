import Account from './account';
import { SupportedBlockchain } from '../config_types';

abstract class DecentralizedAccount extends Account {
    readonly walletAddress: string;

    readonly blockchainName: SupportedBlockchain;

    constructor({ walletAddress, blockchainName }:
         {walletAddress: string, blockchainName: SupportedBlockchain}) {
      super();
      this.walletAddress = walletAddress.toLowerCase();
      this.blockchainName = blockchainName;
    }

    get identifier() {
      return `${this.blockchainName}-${this.walletAddress}`;
    }
}

export default DecentralizedAccount;
