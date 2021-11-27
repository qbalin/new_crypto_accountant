import DecentralizedAccount from './decentralized_account';
import { DecentralizedAccountConfig } from '../config_types';
import FetchingStrategies from '../models/fetching_strategies';
import BlockstreamClient from '../api_clients/blockstream';
import DecentralizedAddress from '../addresses/decentralized_address';
import Transaction from '../models/bitcoin_blockstream/transaction';

class BitcoinAccount extends DecentralizedAccount {
  readonly nickname: string

  readonly blockstreamClient: BlockstreamClient;

  constructor(config: DecentralizedAccountConfig) {
    const address = DecentralizedAddress.getInstance({
      address: config.walletAddress,
      chain: config.blockchainName,
      controlled: true,
      noLowerCase: true,
    });
    super({ ...config, address });
    this.nickname = config.nickname;
    this.blockstreamClient = new BlockstreamClient({
      extPubKey: config.walletAddress,
    });
  }

  async retrieveData() {
    const fetchTransactions = ({ since } :
      { since: Date}) => this.blockstreamClient.getTransactions({ since });

    const transactions = (await FetchingStrategies.BITCOIN.diskNetworkForTransactions({
      fetchMethod: fetchTransactions,
      accountIdentifier: this.identifier,
    })).map((attributes) => new Transaction({
      attributes,
      controlledAddress: this.address as DecentralizedAddress,
    }));
    return transactions;
  }
}

export default BitcoinAccount;
