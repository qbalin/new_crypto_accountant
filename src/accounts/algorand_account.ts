import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig } from '../config_types';
import EtherscanLikeNormalTransaction from '../models/etherscan_like/etherscan_like_normal_transaction';
import AlgorandClient from '../api_clients/algo_explorer';
import Transaction from '../models/algorand/transaction';
import DecentralizedAddress from '../addresses/decentralized_address';

class AlgorandAccount extends DecentralizedAccount {
  readonly nickname: string

  constructor(config: DecentralizedAccountConfig) {
    const address = DecentralizedAddress.getInstance({
      address: config.walletAddress,
      chain: config.blockchainName,
      controlled: true,
    });
    super({ ...config, address });
    this.nickname = config.nickname;
  }

  async retrieveData() {
    const transactions = (await AlgorandClient
      .getTransactions({ walletAddress: this.walletAddress }))
      .map((attributes: Record<string, any>) => new Transaction({ attributes }));

    return [...transactions];
  }
}

export default AlgorandAccount;
