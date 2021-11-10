import BaseAccount from './base_account';
import { DecentralizedAccountConfig } from '../config';

class EthereumAccount extends BaseAccount {
  readonly nickname: string

  readonly blockchainExplorerApiKey: string

  readonly walletAddress: string;

  constructor(config: DecentralizedAccountConfig) {
    super();
    this.nickname = config.nickname;
    this.blockchainExplorerApiKey = config.blockchainExplorerApiKey;
    this.walletAddress = config.walletAddress;
  }

  async fetch() {

  }
}

export default EthereumAccount;
