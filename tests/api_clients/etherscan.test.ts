import { Socket } from 'net';
import { IncomingMessage } from 'http';
import Web3 from 'web3';
import EtherscanClient from '../../src/api_clients/etherscan';
import * as Utils from '../../src/utils';

jest.mock('../../src/utils');

describe('EtherscanClient', () => {
  let mockWeb3WebSocketProvider: jest.SpyInstance;
  const etherscanApiKey = 'etherscan-api-key';
  let infuraApiKey: string;
  const instance = () => new EtherscanClient({ etherscanApiKey, infuraApiKey });

  beforeEach(() => {
    mockWeb3WebSocketProvider = jest.spyOn(Web3.providers, 'WebsocketProvider');
    mockWeb3WebSocketProvider.mockImplementation(() => null);
  });

  describe('#call', () => {
    let prepareMocks: () => void;
    let mockFetchJson: jest.SpyInstance;
    let dataFromFirstCall: any;
    let dataFromSecondCall: any;
    let since: Date | undefined;
    let until: Date | undefined;
    let requestPath: string;
    const subject = () => {
      prepareMocks();
      return instance().call({ requestPath, since, until });
    };

    beforeEach(() => {
      requestPath = '/some/path';
      prepareMocks = () => {
        mockFetchJson = jest.spyOn(Utils, 'fetchJson')
          .mockReturnValueOnce(Promise.resolve({
            data: { result: dataFromFirstCall },
            response: new IncomingMessage(new Socket()),
          }))
          .mockReturnValueOnce(Promise.resolve({
            data: { result: dataFromSecondCall },
            response: new IncomingMessage(new Socket()),
          }));
      };
    });

    describe('when the returned object is not an array', () => {
      beforeEach(() => {
        dataFromFirstCall = 'hello';
      });

      it('calls the endpoint once and returns the object', () => subject().then((data) => {
        expect(mockFetchJson).toHaveBeenCalledTimes(1);
        expect(mockFetchJson).toHaveBeenCalledWith({
          method: 'GET',
          url: `https://api.etherscan.io/api${requestPath}?page=1&offset=10000&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`,
        });
        expect(data).toEqual('hello');
      }));
    });

    describe('when a block range is specified', () => {
      beforeEach(() => {
        dataFromFirstCall = 'hello';
        requestPath = '/some/path?startblock=11&endblock=22';
      });

      it('forwards the url params properly', () => subject().then((data) => {
        expect(mockFetchJson).toHaveBeenCalledTimes(1);
        expect(mockFetchJson).toHaveBeenCalledWith({
          method: 'GET',
          url: `https://api.etherscan.io/api/some/path?startblock=11&endblock=22&page=1&offset=10000&sort=desc&apikey=${etherscanApiKey}`,
        });
        expect(data).toEqual('hello');
      }));
    });

    describe('when the returned object is an array with less than 10k elements', () => {
      beforeEach(() => {
        since = new Date('2021-01-01');
        until = new Date('2021-12-31');
        dataFromFirstCall = [
          {
            timeStamp: new Date('2022-01-01').valueOf() / 1000,
            value: 'Result after "until"',
          },
          {
            timeStamp: new Date('2021-01-01').valueOf() / 1000,
            value: 'Result in window',
          },
          {
            timeStamp: new Date('2020-12-31').valueOf() / 1000,
            value: 'Result before "since"',
          },
        ];
      });

      it('calls the endpoint once and returns the relevant objects', () => subject().then((data) => {
        expect(mockFetchJson).toHaveBeenCalledTimes(1);
        expect(mockFetchJson).toHaveBeenCalledWith({
          method: 'GET',
          url: `https://api.etherscan.io/api${requestPath}?page=1&offset=10000&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`,
        });
        expect(data).toEqual([{
          timeStamp: new Date('2021-01-01').valueOf() / 1000,
          value: 'Result in window',
        }]);
      }));
    });

    describe('when the returned object is an array with 10k elements and the oldest has a timestamp before "since"', () => {
      beforeEach(() => {
        since = new Date('2021-01-01');
        until = new Date('2021-12-31');
        dataFromFirstCall = [];
        dataFromFirstCall.length = 10_000;
        dataFromFirstCall[10_000 - 2] = {
          timeStamp: new Date('2021-01-02').valueOf() / 1000,
          value: 'Result after "since"',
        };
        dataFromFirstCall[10_000 - 1] = {
          timeStamp: new Date('2020-12-31').valueOf() / 1000,
          value: 'Result before "since"',
        };
        dataFromSecondCall = dataFromFirstCall;
      });

      it('calls the endpoint once and returns the relevant objects', () => subject().then((data) => {
        expect(mockFetchJson).toHaveBeenCalledTimes(1);
        expect(mockFetchJson).toHaveBeenCalledWith({
          method: 'GET',
          url: `https://api.etherscan.io/api${requestPath}?page=1&offset=10000&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`,
        });
        expect(data).toEqual([{
          timeStamp: new Date('2021-01-02').valueOf() / 1000,
          value: 'Result after "since"',
        }]);
      }));
    });

    describe('when the returned object is an array with 10k elements and the oldest has a timestamp after "since"', () => {
      beforeEach(() => {
        since = new Date('2021-01-01');
        until = new Date('2021-12-31');
        dataFromFirstCall = [];
        dataFromFirstCall.length = 10_000;
        dataFromFirstCall[10_000 - 2] = {
          timeStamp: new Date('2022-06-01').valueOf() / 1000,
          value: 'Result after "until" from first call',
        };
        dataFromFirstCall[10_000 - 1] = {
          timeStamp: new Date('2021-06-01').valueOf() / 1000,
          value: 'Result after "since" and before "until" from first call',
          blockNumber: 12345,
        };
        dataFromSecondCall = [
          {
            timeStamp: new Date('2021-01-01').valueOf() / 1000,
            value: 'Result after "since" and before "until" from second call',
          },
          {
            timeStamp: new Date('2020-12-31').valueOf() / 1000,
            value: 'Result before "since" from second call',
          },
        ];
      });

      it('calls the endpoint twice and returns the relevant objects', () => subject().then((data) => {
        expect(mockFetchJson).toHaveBeenCalledTimes(2);
        expect(mockFetchJson).toHaveBeenNthCalledWith(1, {
          method: 'GET',
          url: `https://api.etherscan.io/api${requestPath}?page=1&offset=10000&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`,
        });
        // At the second call, it looks up to the block of the oldest
        // transaction returned by the first call, minus 1
        expect(mockFetchJson).toHaveBeenNthCalledWith(2, {
          method: 'GET',
          url: `https://api.etherscan.io/api${requestPath}?page=1&offset=10000&startblock=0&endblock=${12345 - 1}&sort=desc&apikey=${etherscanApiKey}`,
        });
        expect(data).toEqual([
          {
            timeStamp: new Date('2021-06-01').valueOf() / 1000,
            value: 'Result after "since" and before "until" from first call',
            blockNumber: 12345,
          },
          {
            timeStamp: new Date('2021-01-01').valueOf() / 1000,
            value: 'Result after "since" and before "until" from second call',
          },
        ]);
      }));
    });
  });
});
