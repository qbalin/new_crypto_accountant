import fs from 'fs';
import Web3 from 'web3';
import EthereumAccount from '../src/accounts/ethereum_account';
import Account from '../src/accounts/account';
import { SupportedBlockchain, SupportedPlatform } from '../src/config_types';
import Config from '../src/config';
import CoinbaseAccount from '../src/accounts/coinbase_account';

jest.mock('fs');

describe('Config.parse', () => {
  const configFilePath = './path/to/config/file.json';
  let mockExistsSync: jest.SpyInstance;
  let mockWriteFileSync: jest.SpyInstance;
  let mockReadFileSync: jest.SpyInstance;
  let mockWeb3WebSocketProvider: jest.SpyInstance;

  beforeEach(() => {
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    mockWriteFileSync = jest.spyOn(fs, 'writeFileSync');
    mockReadFileSync = jest.spyOn(fs, 'readFileSync');
    mockWeb3WebSocketProvider = jest.spyOn(Web3.providers, 'WebsocketProvider');
    mockWeb3WebSocketProvider.mockImplementation(() => null);
  });

  describe('when a config file exists', () => {
    let config: Record<string, any>;

    beforeEach(() => {
      mockExistsSync.mockImplementation(() => true);
      config = {
        centralizedAccountsConfig: [
          {
            platformName: 'Coinbase',
            privateApiKey: 'SomeCoinbaseKey',
            privateApiPassphrase: 'SomeCoinbaseApiPassphrase',
            privateApiSecret: 'SomeCoinbaseApiSecret',
            nickname: 'Coinbase Main Account',
          },
        ],
        decentralizedAccountsConfig: [
          {
            blockchainName: 'Ethereum',
            blockchainExplorerApiKey: 'SomeOtherKey',
            walletAddress: '0xAdd4355',
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
      expect(mockWriteFileSync).not.toHaveBeenCalledWith(configFilePath, expect.anything());
    });

    it('return accounts', () => {
      const accounts = Config.parse(configFilePath);
      const ethereumAccounts: Account[] = accounts
        .filter((account) => account instanceof EthereumAccount);
      expect(ethereumAccounts).toHaveLength(1);
      const ethereumAccount = ethereumAccounts[0] as EthereumAccount;
      expect(ethereumAccount.nickname).toEqual('Ethereum Main Account');
      expect(ethereumAccount.walletAddress).toEqual('0xadd4355');
      expect(ethereumAccount.blockchainName).toEqual(SupportedBlockchain.Ethereum);

      const coinbaseAccounts: Account[] = accounts
        .filter((account) => account instanceof CoinbaseAccount);
      expect(coinbaseAccounts).toHaveLength(1);
      const coinbaseAccount = coinbaseAccounts[0] as CoinbaseAccount;
      expect(coinbaseAccount.nickname).toEqual('Coinbase Main Account');
      expect(coinbaseAccount.platform).toEqual(SupportedPlatform.Coinbase);
    });

    describe('and the same nickname is used more than once', () => {
      beforeEach(() => {
        config = {
          centralizedAccountsConfig: [
            {
              platformName: 'Binance',
              privateApiKey: 'SomeKey',
              privateApiPassphrase: 'SomeApiPassphrase',
              privateApiSecret: 'SomeApiSecret',
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
              privateApiPassphrase: 'SomeApiPassphrase',
              privateApiSecret: 'SomeApiSecret',
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
              privateApiPassphrase: 'SomeApiPassphrase',
              privateApiSecret: 'SomeApiSecret',
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
              privateApiPassphrase: 'SomeApiPassphrase',
              privateApiSecret: 'SomeApiSecret',
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
        expect(() => Config.parse(configFilePath)).toThrowError('Please add a value for each field: blockchainName,blockchainExplorerApiKey,walletAddress,nickname,nodeProviderApiKey');
      });
    });

    describe('and a field is missing from a centralized account', () => {
      beforeEach(() => {
        config = {
          centralizedAccountsConfig: [
            {
              platformName: 'Binance',
              privateApiKey: '',
              privateApiPassphrase: 'SomeApiPassphrase',
              privateApiSecret: 'SomeApiSecret',
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
        expect(() => Config.parse(configFilePath)).toThrowError('Please add a value for each field: platformName,privateApiKey,privateApiPassphrase,privateApiSecret,nickname');
      });
    });
  });

  describe('when a config file does not exist', () => {
    const defaultConfig = {
      centralizedAccountsConfig: [
        {
          platformName: 'Coinbase',
          privateApiKey: 'The private API generated from your account. Read-only is enough.',
          privateApiSecret: 'The private API secret that goes with the key. Optional sometimes.',
          privateApiPassphrase: 'The private API passphrase that goes with the key. Optional sometimes.',
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
