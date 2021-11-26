import { addressesFromExtPubKey } from '@swan-bitcoin/xpub-lib';
import { fetchJson } from '../utils';

class BitcoinClient {
  private readonly extPubKey: string;

  private readonly baseUrl = 'https://blockstream.info/api';

  constructor({ extPubKey } : { extPubKey: string }) {
    this.extPubKey = extPubKey;
  }

  async getTransactions() {
    const transactions = [];
    let newTransactions = [];
    let addressCount = 100;
    let currentAddressIndex = 0;
    let addresses = addressesFromExtPubKey({ extPubKey: this.extPubKey, network: 'mainnet', addressCount })
      .map((a: { address: string }) => a.address);

    do {
      // eslint-disable-next-line no-await-in-loop
      newTransactions = await (this.getTransactionsForAddress(addresses[currentAddressIndex]));
      transactions.push(...newTransactions);
      currentAddressIndex += 1;
      if (currentAddressIndex === addresses.length) {
        addressCount += 100;
        addresses = addressesFromExtPubKey({ extPubKey: this.extPubKey, network: 'mainnet', addressCount })
          .map((a: { address: string }) => a.address);
      }
    } while (newTransactions.length > 0);

    return transactions;
  }

  private async getTransactionsForAddress(address: string) {
    const url = new URL(`${this.baseUrl}/address/${address}/txs/chain`);
    const transactions = [];
    let oldestTransactionId;

    do {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await fetchJson({ url: url.href });
      transactions.push(...data);
      oldestTransactionId = data[data.length]?.txid;
    } while (oldestTransactionId);

    return transactions;
  }
}

export default BitcoinClient;
