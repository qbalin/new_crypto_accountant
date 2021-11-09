import fs from 'fs';
import Web3 from 'web3';
import { URL } from 'url';
import { fetchJson } from '../utils';

const pathToErc20TokenCache = (chainName: string) => `./downloads/${chainName}_erc20_tokens.json`;

const fallbackTokenData = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
};

class Client {
  readonly pathToErc20TokenCache: string;

  readonly erc20tokens: Record<string, string>;

  readonly web3: Web3;

  readonly chainName: string;

  readonly baseUrl: string;

  readonly apiKey: string;

  constructor({
    apiKey, baseUrl, chainName, web3Instance,
  }: {apiKey: string, baseUrl: string, chainName: string, web3Instance: Web3}) {
    if (!apiKey || !baseUrl || !chainName) {
      throw new Error(
        `An Etherscan-like client must be provided with an apiKey, baseUrl and chainName, got ${JSON.stringify(
          { apiKey, baseUrl, chainName },
        )}`,
      );
    }

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

  private async privateCall({ url, method }: { url: URL, method: string }) :
  Promise<{ data: { result: { [key: string]: any, timeStamp: string }[] } }> {
    url.searchParams.set('apikey', this.apiKey);

    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log('Etherscan call:', url.href);
    }

    return fetchJson({ url: url.href, method });
  }

  static isPaginatedResult(data: any | any[]): boolean {
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

    let {
      data: { result: data },
    } : { data: { result: { timeStamp: string }[] } } = await this.privateCall({
      url,
      method,
    });

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
      const res = await this.privateCall({
        url,
        method,
      });

      data = res.data.result;
      collection = collection.concat(data);
      lastEntry = collection[collection.length - 1];
    }

    console.log(JSON.stringify(collection, null, 2));

    return collection.filter((entry): boolean => {
      const createdAt = new Date(parseInt(entry.timeStamp, 10) * 1000);
      return createdAt >= since && createdAt <= until;
    });
  }

  async findErc20Token({ contractAddress }: { contractAddress: string }) {
    const lowerCasedContractAddress = contractAddress.toLowerCase();
    if (this.erc20tokens[lowerCasedContractAddress]) {
      const token = this.erc20tokens[lowerCasedContractAddress];
      return {
        ...token,
        rawValueToAmount(value) {
          return value * 10 ** (-1 * this.decimals);
        },
      };
    }
    console.log(
      `Token ${lowerCasedContractAddress} is unknown. Fetching info from the blockchain.`,
    );
    const abi = JSON.parse(
      await this.call({
        requestPath: `?module=contract&action=getabi&address=${lowerCasedContractAddress}`,
      }),
    );
    const contract = new this.web3.eth.Contract(abi, lowerCasedContractAddress);

    let name;
    let decimals;
    let symbol;
    if (contract.methods.name && contract.methods.decimals && contract.methods.symbol) {
      name = await contract.methods.name().call();
      decimals = parseInt(await contract.methods.decimals().call(), 10);
      symbol = await contract.methods.symbol().call();
    } else if (fallbackTokenData[lowerCasedContractAddress]) {
      const tokenData = fallbackTokenData[lowerCasedContractAddress];
      name = tokenData.name;
      decimals = tokenData.decimals;
      symbol = tokenData.symbol;
    } else {
      throw new Error(`Erc 20 Token ${contractAddress} is unsupported!`);
    }

    const newToken = {
      symbol,
      name,
      decimals,
    };
    this.erc20tokens[lowerCasedContractAddress] = newToken;
    fs.writeFileSync(this.pathToErc20TokenCache, JSON.stringify(this.erc20tokens));
    return {
      ...newToken,
      rawValueToAmount(value) {
        return value * 10 ** (-1 * this.decimals);
      },
    };
  }
}

export default Client;
