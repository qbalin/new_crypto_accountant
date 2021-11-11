import fs from 'fs';
import Config from '../src/config';

jest.mock('fs');

describe('Config.parse', () => {
  const configFilePath = './path/to/config/file.json';
  let mockExistsSync: jest.SpyInstance;
  let mockWriteFileSync: jest.SpyInstance;
  let mockReadFileSync: jest.SpyInstance;

  beforeEach(() => {
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    mockWriteFileSync = jest.spyOn(fs, 'writeFileSync');
    mockReadFileSync = jest.spyOn(fs, 'readFileSync');
  });

  describe('when a config file exists', () => {
    let config: Record<string, any>;

    beforeEach(() => {
      mockExistsSync.mockImplementation(() => true);
      config = {
        centralizedAccountsConfig: [
          {
            platformName: 'Binance',
            privateApiKey: 'SomeKey',
            nickname: 'Binance Main Account',
          },
        ],
        decentralizedAccountsConfig: [
          {
            blockchainName: 'Ethereum',
            blockchainExplorerApiKey: 'SomeOtherKey',
            walletAddress: 'anAddress',
            nickname: 'Ethereum Main Account',
            nodeProviderApiKey: 'Infura API key',
          },
        ],
      };
      mockReadFileSync.mockImplementation(() => JSON.stringify(config));
    });

    it('does not create a default file', () => {
      Config.parse(configFilePath);
      expect(mockExistsSync).toHaveBeenCalledWith(configFilePath);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('returns a config object', () => {
      const conf = Config.parse(configFilePath);
      expect(conf.centralizedAccountsConfig[0].platformName).toEqual('binance');
      expect(conf.centralizedAccountsConfig[0].privateApiKey).toEqual('SomeKey');
      expect(conf.centralizedAccountsConfig[0].nickname).toEqual('Binance Main Account');

      expect(conf.decentralizedAccountsConfig[0].blockchainName).toEqual('ethereum');
      expect(conf.decentralizedAccountsConfig[0].blockchainExplorerApiKey).toEqual('SomeOtherKey');
      expect(conf.decentralizedAccountsConfig[0].walletAddress).toEqual('anaddress');
      expect(conf.decentralizedAccountsConfig[0].nickname).toEqual('Ethereum Main Account');
    });

    describe('and the same nickname is used more than once', () => {
      beforeEach(() => {
        config = {
          centralizedAccountsConfig: [
            {
              platformName: 'Binance',
              privateApiKey: 'SomeKey',
              nickname: 'Main Account',
            },
          ],
          decentralizedAccountsConfig: [
            {
              blockchainName: 'Ethereum',
              blockchainExplorerApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Main Account',
              nodeProviderApiKey: 'Infura API key',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse(configFilePath)).toThrowError(/Account nicknames should be unique, you re-used "Main Account" multiple times/);
      });
    });

    describe('and a platformName is not supported', () => {
      beforeEach(() => {
        config = {
          centralizedAccountsConfig: [
            {
              platformName: 'Unsupported',
              privateApiKey: 'SomeKey',
              nickname: 'Unsupported Main Account',
            },
          ],
          decentralizedAccountsConfig: [
            {
              blockchainName: 'Ethereum',
              blockchainExplorerApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Ethereum Main Account',
              nodeProviderApiKey: 'Infura API key',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse(configFilePath)).toThrowError(/Unsupported platformName for account/);
      });
    });

    describe('and a blockchainName is not supported', () => {
      beforeEach(() => {
        config = {
          centralizedAccountsConfig: [
            {
              platformName: 'Binance',
              privateApiKey: 'SomeKey',
              nickname: 'Binance Main Account',
            },
          ],
          decentralizedAccountsConfig: [
            {
              blockchainName: 'Unsupported',
              blockchainExplorerApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Unsupported Main Account',
              nodeProviderApiKey: 'Infura API key',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse(configFilePath)).toThrowError(/Unsupported blockchainName for account/);
      });
    });

    describe('and a field is missing from a decentralized account', () => {
      beforeEach(() => {
        config = {
          centralizedAccountsConfig: [
            {
              platformName: 'Binance',
              privateApiKey: 'SomeKey',
              nickname: 'Binance Main Account',
            },
          ],
          decentralizedAccountsConfig: [
            {
              blockchainName: 'Ethereum',
              blockchainExplorerApiKey: 'SomeOtherKey',
              walletAddress: '',
              nickname: 'Ethereum Main Account',
              nodeProviderApiKey: 'Infura API key',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse(configFilePath)).toThrowError(/Please add a value for each field: blockchainName,privateApiKey,walletAddress,nickname/);
      });
    });

    describe('and a field is missing from a centralized account', () => {
      beforeEach(() => {
        config = {
          centralizedAccountsConfig: [
            {
              platformName: 'Binance',
              privateApiKey: '',
              nickname: 'Binance Main Account',
            },
          ],
          decentralizedAccountsConfig: [
            {
              blockchainName: 'Ethereum',
              blockchainExplorerApiKey: 'SomeOtherKey',
              walletAddress: 'anAddress',
              nickname: 'Ethereum Main Account',
              nodeProviderApiKey: 'Infura API key',
            },
          ],
        };
        mockReadFileSync.mockImplementation(() => JSON.stringify(config));
      });

      it('raises an error', () => {
        expect(() => Config.parse(configFilePath)).toThrowError(/Please add a value for each field: platformName,privateApiKey,nickname/);
      });
    });
  });

  describe('when a config file does not exist', () => {
    const defaultConfig = {
      centralizedAccountsConfig: [
        {
          platformName: 'Coinbase or KuCoin or Binance, etc..',
          privateApiKey: 'The private API generated from your account. Read-only is enough.',
          nickname: 'A unique name to recognize your account',
        },
        {

        },
      ],
      decentralizedAccountsConfig: [
        {
          blockchainName: 'Ethereum',
          blockchainExplorerApiKey: 'The private API generated from your Explorer account.',
          walletAddress: 'Your public wallet address on the blockchain',
          nickname: 'A unique name to recognize your account',
          nodeProviderApiKey: 'Api key from Infura, or Alchemy, etc',
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
      expect(() => Config.parse(configFilePath)).toThrow();
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(defaultConfig, null, 2),
      );
    });

    it('throws an error', () => {
      expect(() => Config.parse(configFilePath)).toThrowError(`No config file could be found. A default one was created at ${configFilePath}`);
    });
  });
});
