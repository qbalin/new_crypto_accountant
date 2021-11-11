import { IncomingMessage } from 'http';
import https from 'https';

interface FetchResponse {
    data: any
    response: IncomingMessage
}

const fetchJson = ({
  url,
  method,
  headers = {},
}: {
    url: string,
    method: string,
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

export {
  // eslint-disable-next-line import/prefer-default-export
  fetchJson,
};
