import { Socket } from 'net';
import { IncomingMessage } from 'http';
import EtherscanClient from '../../src/api_clients/etherscan';
import * as Utils from '../../src/utils';

jest.mock('../../src/utils');

describe('EtherscanClient', () => {
  const etherscanApiKey = 'etherscan-api-key';
  let infuraApiKey: string;
  const instance = () => new EtherscanClient({ etherscanApiKey, infuraApiKey });

  describe('#call', () => {
    let mockFetchJson: () => jest.SpyInstance;
    let dataFromFirstCall: any;
    let dataFromSecondCall: any;
    const requestPath = '/some/path';
    const subject = () => instance().call({ requestPath });

    beforeEach(() => {
      mockFetchJson = () => jest.spyOn(Utils, 'fetchJson')
        .mockReturnValueOnce(Promise.resolve({
          data: dataFromFirstCall,
          response: new IncomingMessage(new Socket()),
        }))
        .mockReturnValueOnce(Promise.resolve({
          data: dataFromSecondCall,
          response: new IncomingMessage(new Socket()),
        }));
    });

    describe('when the returned object is not an array', () => {
      beforeEach(() => {
        dataFromFirstCall = { result: 'hello' };
      });

      it('calls the endpoint once and returns the object', () => subject().then((data) => {
        expect(mockFetchJson()).toHaveBeenCalledWith({
          method: 'GET',
          url: `https://api.etherscan.io/api${requestPath}?page=1&offset=10000&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`,
        });
        expect(data).toEqual(dataFromFirstCall);
      }));
    });
  });
});
