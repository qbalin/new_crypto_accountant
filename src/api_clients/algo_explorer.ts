import { fetchJson } from '../utils';

class Client {
  private static readonly baseUrl = 'https://algoexplorerapi.io/idx2/v2';

  static async getTransactions({ walletAddress }: { walletAddress: string }) {
    const url = new URL(this.baseUrl);
    url.pathname += '/transactions';
    url.searchParams.set('address', walletAddress.toUpperCase());

    const { data: { transactions } } = await fetchJson({ url: url.href });
    console.log(url.href, transactions);
    return transactions;
  }
}

export default Client;
