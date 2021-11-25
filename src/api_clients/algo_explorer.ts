import { fetchJson } from '../utils';

class Client {
  private static readonly baseUrl = 'https://algoexplorerapi.io/idx2/v2';

  static async getTransactions({ walletAddress, since = new Date('1970') }: { walletAddress: string, since?: Date }) {
    const url = new URL(this.baseUrl);
    url.pathname += '/transactions';
    url.searchParams.set('address', walletAddress.toUpperCase());

    const { data: { transactions } } = await fetchJson({ url: url.href });

    return transactions.filter((t: {'round-time': number}) => t['round-time'] * 1000 >= +since);
  }
}

export default Client;
