import fs from 'fs';
import Config, { AccountsConfiguration } from '../src/config';

jest.mock('fs');

describe('Config.parse', () => {
  let mockExistsSync: jest.SpyInstance;
  let mockWriteFileSync: jest.SpyInstance;
  let mockReadFileSync: jest.SpyInstance;

  beforeEach(() => {
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    mockWriteFileSync = jest.spyOn(fs, 'writeFileSync');
    mockReadFileSync = jest.spyOn(fs, 'readFileSync');
  });

  describe('when a config file exists', () => {
    let config: AccountsConfiguration;

    beforeEach(() => {
      mockExistsSync.mockImplementation(() => true);
      config = {
        centralizedAccounts: [
          {
            platformName: 'Binance',
            privateApiKey: 'SomeKey',
            nickname: 'Binance Main Account',
          },
        ],
        decentralizedAccounts: [
          {
            blockchainName: 'Ethereum',
            privateApiKey: 'SomeOtherKey',
            walletAddress: 'anAddress',
            nickname: 'Ethereum Main Account',
          },
        ],
      };
      mockReadFileSync.mockImplementation(() => JSON.stringify(config));
    });

    it('does not create a default file', () => {
      Config.parse();
      expect(mockExistsSync).toHaveBeenCalledWith('./config.json');
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('returns a config object', () => {
      const conf = Config.parse();
      expect(conf.centralizedAccounts[0].platformName).toEqual('binance');
      expect(conf.centralizedAccounts[0].privateApiKey).toEqual('SomeKey');
      expect(conf.centralizedAccounts[0].nickname).toEqual('Binance Main Account');

      expect(conf.decentralizedAccounts[0].blockchainName).toEqual('ethereum');
      expect(conf.decentralizedAccounts[0].privateApiKey).toEqual('SomeOtherKey');
      expect(conf.decentralizedAccounts[0].walletAddress).toEqual('anaddress');
      expect(conf.decentralizedAccounts[0].nickname).toEqual('Ethereum Main Account');
    });

    describe('and the same nickname is used more than once', () => {
      beforeEach(() => {
        config = {
          centralizedAccounts: [
            {
              platformName: 'Binance',
              privateApiKey: 'SomeKey',
              nickname: 'Main Account',
            },
          ],
          decentralizedAccounts: [
            {
              blockchainName: 'Ethereum',
              privateApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Main Account',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse()).toThrowError(/Account nicknames should be unique, you re-used "Main Account" multiple times/);
      });
    });

    describe('and a platformName is not supported', () => {
      beforeEach(() => {
        config = {
          centralizedAccounts: [
            {
              platformName: 'Unsupported',
              privateApiKey: 'SomeKey',
              nickname: 'Unsupported Main Account',
            },
          ],
          decentralizedAccounts: [
            {
              blockchainName: 'Ethereum',
              privateApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Ethereum Main Account',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse()).toThrowError(/Unsupported platformName for account/);
      });
    });

    describe('and a blockchainName is not supported', () => {
      beforeEach(() => {
        config = {
          centralizedAccounts: [
            {
              platformName: 'Binance',
              privateApiKey: 'SomeKey',
              nickname: 'Binance Main Account',
            },
          ],
          decentralizedAccounts: [
            {
              blockchainName: 'Unsupported',
              privateApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Unsupported Main Account',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse()).toThrowError(/Unsupported blockchainName for account/);
      });
    });

    describe('and a field is missing from a decentralized account', () => {
      beforeEach(() => {
        config = {
          centralizedAccounts: [
            {
              platformName: 'Binance',
              privateApiKey: 'SomeKey',
              nickname: 'Binance Main Account',
            },
          ],
          decentralizedAccounts: [
            {
              blockchainName: 'Ethereum',
              privateApiKey: 'SomeOtherKey',
              walletAddress: '',
              nickname: 'Ethereum Main Account',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse()).toThrowError(/Please add a value for each field: blockchainName,privateApiKey,walletAddress,nickname/);
      });
    });

    describe('and a field is missing from a centralized account', () => {
      beforeEach(() => {
        config = {
          centralizedAccounts: [
            {
              platformName: 'Binance',
              privateApiKey: '',
              nickname: 'Binance Main Account',
            },
          ],
          decentralizedAccounts: [
            {
              blockchainName: 'Ethereum',
              privateApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Ethereum Main Account',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse()).toThrowError(/Please add a value for each field: platformName,privateApiKey,nickname/);
      });
    });
  });

  describe('when a config file does not exist', () => {
    const defaultConfig = {
      centralizedAccounts: [
        {
          platformName: 'Coinbase or KuCoin or Binance, etc..',
          privateApiKey: 'The private API generated from your account. Read-only is enough.',
          nickname: 'A unique name to recognize your account',
        },
        {

        },
      ],
      decentralizedAccounts: [
        {
          blockchainName: 'Ethereum or Polygon, etc...',
          privateApiKey: 'The private API generated from your Explorer account.',
          walletAddress: 'Your public wallet address on the blockchain',
          nickname: 'A unique name to recognize your account',
        },
        {

        },
      ],
    };

    beforeEach(() => {
      mockExistsSync.mockImplementation(() => false);
      mockReadFileSync.mockImplementation(() => JSON.stringify(defaultConfig));
    });

    it('creates a default file', () => {
      expect(() => Config.parse()).toThrow();
      expect(mockWriteFileSync).toHaveBeenCalledWith('./config.json', JSON.stringify(defaultConfig, null, 2));
    });

    it('throws an error', () => {
      expect(() => Config.parse()).toThrowError(/Unsupported platformName for account/);
    });
  });
});
