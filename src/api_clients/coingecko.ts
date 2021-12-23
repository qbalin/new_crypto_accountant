// eslint-disable-next-line max-classes-per-file
import fs from 'fs';
import { fetchJson, rateLimit } from '../utils';

const rateLimitedFetchJson = rateLimit({ fn: fetchJson, callsPerMinute: 50 });

const padWithOneZero = (n: number) => (n < 10 ? `0${n}` : n.toString());

const convertDate = (date: Date) => {
  const month = padWithOneZero(date.getMonth() + 1);
  const day = padWithOneZero(date.getDate());
  return `${day}-${month}-${date.getFullYear()}`;
};

class CoinList {
  symbolToMap: Record<string, string>;

  constructor(list: { id: string, symbol: string, name: string}[]) {
    this.symbolToMap = list.reduce((memo, value) => {
      // eslint-disable-next-line no-param-reassign
      memo[value.symbol] = value.id;
      return memo;
    }, {} as Record<string, string>);
  }

  getId(symbol: string) {
    return this.symbolToMap[symbol]
    || this.symbolToMap[symbol.toLowerCase()]
    || this.symbolToMap[symbol.toUpperCase()];
  }
}

class CoingeckoClient {
  private readonly baseUrl: string;

  private coinList: null | CoinList;

  cache: null | Record<string, any>;

  constructor() {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.coinList = null;
    this.cache = null;
    this.getCoinList();
  }

  async getCoinList() {
    if (this.coinList) {
      return this.coinList;
    }
    const url = new URL(this.baseUrl);
    url.pathname += '/coins/list';
    url.searchParams.set('include_platform', 'false');

    console.log(url.href);

    const { data } = await rateLimitedFetchJson({ url: url.href, headers: { accept: 'application/json' } });
    this.coinList = new CoinList(data);
    return this.coinList;
  }

  async getPrice({ at, ticker } : { at: Date, ticker: string }) {
    console.log('at, ticker', at, ticker);
    const coinId = (await this.getCoinList()).getId(ticker);
    if (!coinId) {
      throw new Error(`Coin with ticker ${ticker} is not listed on Coingecko`);
    }

    const path = './downloads/coingecko_client_cache.json';
    if (!this.cache) {
      if (!fs.existsSync(path)) {
        fs.writeFileSync(path, '{}');
      }
      this.cache = JSON.parse(fs.readFileSync(path, { encoding: 'utf8' })) as Record<string, any>;
    }
    if (this.cache[coinId]?.[(+at).toString()]) {
      console.log('ici', coinId, at, this.cache[coinId][+at.toString()]);
      return this.cache[coinId][(+at).toString()];
    }

    const url = new URL(this.baseUrl);
    url.pathname += `/coins/${coinId}/history`;
    url.searchParams.set('localization', 'false');
    url.searchParams.set('date', convertDate(at));

    console.log(url.href);

    const { data } = await rateLimitedFetchJson({ url: url.href, headers: { accept: 'application/json' } });

    this.cache[coinId] ||= {};
    console.log(at, data.market_data.current_price.usd);
    this.cache[coinId][(+at).toString()] = data.market_data.current_price.usd;
    fs.writeFileSync(path, JSON.stringify(this.cache, null, 2));
    return data.market_data.current_price.usd;
  }
}

export default new CoingeckoClient();
