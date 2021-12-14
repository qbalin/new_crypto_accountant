import crypto from 'crypto';
import { fetchJson as nonLimitedFetchJson, HttpMethod, rateLimit } from '../utils';

// 3 calls per second conservatively: https://help.coinbase.com/en/pro/other-topics/api/faq-on-api
const fetchJson = rateLimit({ fn: nonLimitedFetchJson, callsPerMinute: 180 });

const signature = (
  secret: string,
  timestamp: string,
  requestPath: string,
  body: Record<string, any>,
  method: string,
) => {
  const upperCasedMethod = method.toUpperCase();
  const actualBody = upperCasedMethod === 'GET' ? '' : body;
  // create the prehash string by concatenating required parts
  const what = timestamp + upperCasedMethod + requestPath + actualBody;

  // decode the base64 secret
  const key = Buffer.from(secret, 'base64');

  // create a sha256 hmac with the secret
  const hmac = crypto.createHmac('sha256', key);

  // sign the require message with the hmac
  // and finally base64 encode the result
  return hmac.update(what).digest('base64');
};

class Client {
  private readonly baseUrl: string;

  private readonly secret: any;

  private readonly apiKey: any;

  private readonly apiPassphrase: any;

  constructor({ secret, apiKey, apiPassphrase } :
    { secret: string, apiKey: string, apiPassphrase: string }) {
    this.baseUrl = 'https://api.pro.coinbase.com';
    this.secret = secret;
    this.apiKey = apiKey;
    this.apiPassphrase = apiPassphrase;
  }

  private privateCall({
    url, method, body, timestamp,
  } : {
      url: URL, method: HttpMethod, body: Record<string, any>, timestamp: string,
  }) {
    console.log('CoinbaseClient call:', url.href);

    const headers = {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-PASSPHRASE': this.apiPassphrase,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-SIGN': signature(
        this.secret,
        timestamp,
        `${url.pathname}${url.search}`,
        body,
        method,
      ),
      'User-Agent': 'me',
    };

    return fetchJson({ url: url.href, method, headers });
  }

  static isPaginatedResult(data: any) {
    return Array.isArray(data);
  }

  async call({
    requestPath,
    since = new Date('1970'),
    until = new Date(),
    method = 'GET',
    body = {},
  }: {
    requestPath: string,
    since?: Date,
    until?: Date,
    method?: HttpMethod,
    body?: Record<string, any>,
  }) {
    let collection: Record<string, any> = [];
    const url = new URL(`${this.baseUrl}${requestPath}`);

    let {
      data,
      response: { headers },
    } = await this.privateCall({
      url,
      method,
      body,
      timestamp: (Date.now() / 1000).toString(),
    });

    // If what is returned is a single object, we're done
    if (!Client.isPaginatedResult(data)) {
      return data;
    }

    collection = collection.concat(data);
    let lastEntry = collection[collection.length - 1];

    while (data.length > 0 && new Date(lastEntry.created_at) >= since) {
      // When cb-after is a date, it needs to be turned into an ISOString()
      const cbAfterAsDate = new Date(headers['cb-after'] as string);
      if (Number.isNaN(cbAfterAsDate.valueOf())) {
        url.searchParams.set('after', headers['cb-after'] as string);
      } else {
        url.searchParams.set('after', cbAfterAsDate.toISOString());
      }

      /* eslint-disable-next-line no-await-in-loop */
      const res = await this.privateCall({
        url,
        method,
        body,
        timestamp: (Date.now() / 1000).toString(),
      });

      data = res.data;
      headers = res.response.headers;
      collection = collection.concat(data);
      lastEntry = collection[collection.length - 1];
    }

    return collection.filter((entry: Record<string, any>) => {
      if (!entry.created_at) {
        return true;
      }
      const createdAt = new Date(entry.created_at);
      return createdAt >= since && createdAt <= until;
    });
  }
}

export default Client;
