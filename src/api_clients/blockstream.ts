import { fetchJson } from '../utils';

class BitcoinClient {
  private readonly address: string;

  private readonly baseUrl = 'https://blockstream.info/api';

  constructor({ address } : { address: string }) {
    this.address = address;
  }

  async getTransactions() {
    const url = new URL(`${this.baseUrl}/address/${this.address}/txs/chain`);
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
