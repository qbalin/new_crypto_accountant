import BaseAccount from './base_account';
import { DecentralizedAccountConfig } from '../config';

class EthereumAccount extends BaseAccount {
  readonly nickname: string

  readonly privateApiKey: string

  readonly walletAddress: string;

  constructor(config: DecentralizedAccountConfig) {
    super();
    this.nickname = config.nickname;
    this.privateApiKey = config.privateApiKey;
    this.walletAddress = config.walletAddress;
  }

  async fetch() {

  }
}

export default EthereumAccount;
