import { CentralizedAccountConfig } from '../config_types';
import CentralizedAccount from './centralized_account';
import FetchingStrategies from '../models/fetching_strategies';
import KucoinClient from '../api_clients/kucoin';
import LedgerEntry from '../models/kucoin/ledger_entry';

class KucoinAccount extends CentralizedAccount {
  private readonly kucoinClient: KucoinClient;

  constructor(config: CentralizedAccountConfig) {
    super({ nickname: config.nickname, platform: config.platformName });
    this.kucoinClient = new KucoinClient({
      secret: config.privateApiSecret,
      apiKey: config.privateApiKey,
      apiPassphrase: config.privateApiPassphrase,
    });
  }

  async retrieveData() {
    const fetchTransactions = ({ since } :
      { since: Date}) => this.kucoinClient.ledgers({ since });

    const transactions = (await FetchingStrategies.KUCOIN.diskNetworkForTransactions({
      fetchMethod: fetchTransactions,
      accountIdentifier: this.identifier,
    })).map((attributes) => new LedgerEntry({
      attributes,
      accountNickname: this.nickname,
    }));

    return transactions;
  }
}

export default KucoinAccount;
