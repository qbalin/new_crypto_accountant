import { CentralizedAccountConfig } from '../config_types';
import CentralizedAccount from './centralized_account';
import FetchingStrategies from '../models/fetching_strategies';
import KucoinClient from '../api_clients/kucoin';
import LedgerEntry from '../models/kucoin/ledger_entry';
import TransactionBundle, { BundleAction, BundleStatus } from '../models/transaction_bundle';
import { groupBy, partition } from '../utils';

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

    const nonEmptyBundles = transactions
      .map((t) => t.transactionBundle())
      // Remove transparent actions, like transfering between internal accounts
      .filter((b) => b.action !== BundleAction.noOp)
      .filter((bundle) => !bundle.isEmpty);

    const [tradeBundles, nonTradeBundles] = partition(nonEmptyBundles, (bundle) => bundle.isTrade);

    const tradesGroupedByIds = groupBy(tradeBundles, (bundle) => bundle.id);
    const consolidatedTradeBundes = Object
      .entries(tradesGroupedByIds)
      .map(([tradeId, groupedBundles]) => {
        if (groupedBundles.length !== 2) {
          throw new Error(`A Kucoin trade should be made of a transaction going in, and one going out plus a possible fee. Got: ${JSON.stringify(groupedBundles, null, 2)}`);
        }
        const createdAts = groupedBundles
          .flatMap((b) => b.atomicTransactions.map((t) => t.createdAt))
          .map((createdAt) => +createdAt);
        if (new Set(createdAts).size !== 1) {
          const minCreatedAt = Math.min(...createdAts);
          const maxCreatedAt = Math.max(...createdAts);
          if (maxCreatedAt - minCreatedAt > 3000) {
            throw new Error(`All Kucoin trade transactions should bear a close timestamp (within 3s of each other). Got: ${JSON.stringify(groupedBundles, null, 2)}`);
          }
        }
        return new TransactionBundle({
          atomicTransactions: groupedBundles.flatMap((bundle) => bundle.atomicTransactions),
          action: BundleAction.trade,
          status: BundleStatus.complete,
          id: tradeId,
        });
      });

    return [...consolidatedTradeBundes, ...nonTradeBundles];
  }
}

export default KucoinAccount;
