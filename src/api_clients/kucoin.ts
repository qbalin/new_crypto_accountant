import crypto from 'crypto';
import { fetchJson, rateLimit, beginningOfYear } from '../utils';

const fetchSixPerSecond = rateLimit({ callsPerMinute: 360, fn: fetchJson });

class KucoinClient {
  private readonly baseUrl: string;

  private readonly secret: string;

  private readonly apiKey: string;

  private readonly apiPassphrase: string;

  constructor({ secret, apiKey, apiPassphrase } :
    { secret: string, apiKey: string, apiPassphrase: string }) {
    this.baseUrl = 'https://api.kucoin.com';
    this.secret = secret;
    this.apiKey = apiKey;
    this.apiPassphrase = apiPassphrase;
  }

  private static signature(
    secret: string, timestamp: number, requestPath: string, body: string, method: string,
  ) {
    const upperCasedMethod = method.toUpperCase();
    const actualBody = upperCasedMethod === 'GET' ? '' : body;
    // create the prehash string by concatenating required parts
    const what = timestamp + upperCasedMethod + requestPath + actualBody;

    // create a sha256 hmac with the secret
    const hmac = crypto.createHmac('sha256', secret);

    // sign the require message with the hmac
    // and finally base64 encode the result
    return hmac.update(what).digest('base64');
  }

  private static encryptedPassphrase(secret: string, passphrase: string) {
    // create a sha256 hmac with the secret
    const hmac = crypto.createHmac('sha256', secret);

    // sign the require message with the hmac
    // and finally base64 encode the result
    return hmac.update(passphrase).digest('base64');
  }

  private headers(url: URL, body: string = '', method: string = 'GET') {
    const timestamp = Date.now();
    return {
      'KC-API-KEY': this.apiKey,
      'KC-API-PASSPHRASE': KucoinClient.encryptedPassphrase(this.secret, this.apiPassphrase),
      'KC-API-KEY-VERSION': '2',
      'KC-API-TIMESTAMP': timestamp.toString(),
      'KC-API-SIGN': KucoinClient.signature(
        this.secret,
        timestamp,
        `${url.pathname}${url.search}`,
        body,
        method,
      ),
    };
  }

  async ledgers({ since = beginningOfYear(), until = new Date() } :
    { since?: Date, until?: Date } = {}) {
    if (since > until) {
      throw new Error(`since ${since} should be before until ${until}`);
    }

    const results = [];
    const url = new URL(this.baseUrl);
    const now = new Date();
    const oneDay = 1000 * 3600 * 24;

    // endAt and startAt cannot be distant of more than a day
    // startAt is inclusive, endAt is exclusive
    let endAt = new Date(Math.min(+until, +now));
    let startAt = new Date(Math.max(+new Date(+endAt - oneDay), +since));
    // let startAt = since;
    // const startAt = new Date('2021-11-06');
    url.pathname = '/api/v1/accounts/ledgers';
    url.searchParams.set('endAt', endAt.valueOf().toString());
    url.searchParams.set('startAt', startAt.valueOf().toString());

    let response = (await fetchSixPerSecond({ url: url.href, headers: this.headers(url) })).data;
    console.log(url.href);
    results.push(...response.data.items);

    while (since < startAt) {
      endAt = new Date(+endAt - oneDay);
      startAt = new Date(Math.max(+new Date(+endAt - oneDay), +since));
      url.searchParams.set('endAt', endAt.valueOf().toString());
      url.searchParams.set('startAt', startAt.valueOf().toString());
      url.searchParams.set('currentPage', '1');
      // eslint-disable-next-line no-await-in-loop
      response = (await fetchSixPerSecond({ url: url.href, headers: this.headers(url) })).data;
      console.log(url.href);
      results.push(...response.data.items);

      while (response.data.currentPage < response.data.totalPage) {
        url.searchParams.set('currentPage', response.data.currentPage + 1);
        // eslint-disable-next-line no-await-in-loop
        response = (await fetchSixPerSecond({ url: url.href, headers: this.headers(url) })).data;
        results.push(...response.data.items);
      }
    }

    return results;
  }
}

export default KucoinClient;
