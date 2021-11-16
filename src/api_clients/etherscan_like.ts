import fs from 'fs';
import Web3 from 'web3';
import { URL } from 'url';
import { fetchJson } from '../utils';

const pathToErc20TokenCache = (chainName: string) => `./downloads/${chainName}_erc20_tokens.json`;

abstract class Client {
  readonly pathToErc20TokenCache: string;

  readonly erc20tokens: Record<string, string>;

  readonly web3: Web3;

  readonly chainName: string;

  readonly baseUrl: string;

  readonly apiKey: string;

  constructor({
    apiKey, baseUrl, chainName, web3Instance,
  }: {apiKey: string, baseUrl: string, chainName: string, web3Instance: Web3}) {
    this.pathToErc20TokenCache = pathToErc20TokenCache(chainName);

    fs.writeFileSync(this.pathToErc20TokenCache, '', { flag: 'a' });
    this.erc20tokens = JSON.parse(
      fs.readFileSync(this.pathToErc20TokenCache, { encoding: 'utf8' }) || '{}',
    );

    this.web3 = web3Instance;

    this.chainName = chainName;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  static isPaginatedResult(data: any) {
    return Array.isArray(data);
  }

  async call({
    requestPath, since = new Date('1970'), until = new Date(), method = 'GET',
  }: { requestPath: string, since?: Date, until?: Date, method?: string }) {
    let collection: {
        [key: string]: any,
        timeStamp: string
    }[] = [];
    const url = new URL(`${this.baseUrl}${requestPath}`);
    // Etehrscan can never return more than 10k results, so pagination is achieved with block lookup
    url.searchParams.set('page', '1');
    url.searchParams.set('offset', '10000');
    url.searchParams.set('startblock', url.searchParams.get('startblock') || '0');
    url.searchParams.set('endblock', url.searchParams.get('endblock') || '99999999');
    url.searchParams.set('sort', 'desc');

    let data = (await this.privateCall({
      url,
      method,
    })).data.result;

    // If what is returned is a single object, i.e. it does not have pagination info, we're done
    if (!Client.isPaginatedResult(data)) {
      return data;
    }

    collection = collection.concat(data);
    let lastEntry = collection[collection.length - 1];

    while (data.length
      && data.length >= 10_000
      && new Date(parseInt(lastEntry.timeStamp, 10) * 1000) >= since
    ) {
      url.searchParams.set('endblock', (parseInt(lastEntry.blockNumber, 10) - 1).toString());

      /* eslint-disable-next-line no-await-in-loop */
      data = (await this.privateCall({
        url,
        method,
      })).data.result;

      collection = collection.concat(data);
      lastEntry = collection[collection.length - 1];
    }

    return collection.filter((entry): boolean => {
      const createdAt = new Date(parseInt(entry.timeStamp, 10) * 1000);
      return createdAt >= since && createdAt <= until;
    });
  }

  private async privateCall({ url, method }: { url: URL, method: string }) :
  Promise<{ data: { result: { [key: string]: any, timeStamp: string }[] } }> {
    url.searchParams.set('apikey', this.apiKey);
    return fetchJson({ url: url.href, method });
  }
}

export default Client;
