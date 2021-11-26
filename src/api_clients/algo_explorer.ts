import { fetchJson } from '../utils';

class Client {
  private static readonly baseUrl = 'https://algoexplorerapi.io/idx2/v2';

  static async getTransactions({ walletAddress, since = new Date('1970') }: { walletAddress: string, since?: Date }) {
    const url = new URL(this.baseUrl);
    url.pathname += '/transactions';
    url.searchParams.set('address', walletAddress.toUpperCase());
    url.searchParams.set('after-time', since.toISOString());

    let nextCursor;
    const transactions = [];

    do {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await fetchJson({ url: url.href });
      transactions.push(...data.transactions);
      nextCursor = data['next-token'];
      url.searchParams.set('next', nextCursor);
    } while (nextCursor);

    return transactions.filter((t: {'round-time': number}) => t['round-time'] * 1000 >= +since);
  }

  static async getAssets({ assetIds } : { assetIds: number[] }) {
    const url = new URL(this.baseUrl);
    url.pathname += '/assets';
    const assets: Record<string, any>[] = [];

    for (let i = 0; i < assetIds.length; i += 1) {
      const assetId = assetIds[i];
      url.searchParams.set('asset-id', assetId.toString());
      // eslint-disable-next-line no-await-in-loop
      const { data } = await fetchJson({ url: url.href });
      assets.push(...data.assets);
    }

    return assets;
  }
}

export default Client;
