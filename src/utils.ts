import { IncomingMessage } from 'http';
import https from 'https';

interface FetchResponse {
    data: any
    response: IncomingMessage
}

export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'

const fetchJson = ({
  url,
  method = 'GET',
  headers = {},
}: {
    url: string,
    method?: HttpMethod,
    headers?: Record<string, string>
}) : Promise<FetchResponse> => new Promise((resolve, reject) => {
  const req = https.request(
    url,
    {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
    },
    (res) => {
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          data: JSON.parse(data),
          response: res,
        });
      });
    },
  );

  req.on('error', (e) => {
    reject(e);
  });

  req.end();
});

const groupBy = <T, U extends Record<keyof T, any>>
  (collection: U[], groupingKey: keyof T) => collection
    .reduce((memo, value) => {
      // eslint-disable-next-line no-param-reassign
      memo[value[groupingKey]] ||= [];
      memo[value[groupingKey]].push(value);
      return memo;
    }, {} as Record<U[keyof T], U[]>);

const uniq = <T>(collection: T[]) : T[] => Array.from(new Set(collection));

export {
  fetchJson,
  groupBy,
  uniq,
};
