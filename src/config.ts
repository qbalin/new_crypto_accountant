/* eslint-disable no-param-reassign */
import fs from 'fs';
import EthereumAccount from './accounts/ethereum_account';
import Account from './accounts/account';
import {
  SupportedPlatform,
  SupportedBlockchain,
  CentralizedAccountConfig,
  DecentralizedAccountConfig,
  AccountsConfiguration,
} from './config_types';

const SUPPORTED_PLATFORMS = Object.values(SupportedPlatform);
const SUPPORTED_BLOCKCHAINS = Object.values(SupportedBlockchain);

const notEmpty = (object: { [key: string]: any }) : boolean => Object.keys(object).length > 0;
const isPresent = <T>(arg: T | undefined | 0 | null | false | ''): arg is T => !!arg;

class Config {
  readonly centralizedAccountsConfig: Array<CentralizedAccountConfig>;

  readonly decentralizedAccountsConfig: Array<DecentralizedAccountConfig>;

  constructor({ centralizedAccountsConfig, decentralizedAccountsConfig }: AccountsConfiguration) {
    this.centralizedAccountsConfig = centralizedAccountsConfig
      .filter(notEmpty)
      .map((account) => ({
        ...account,
        platformName: account.platformName.toLowerCase() as SupportedPlatform,
      }));
    this.decentralizedAccountsConfig = decentralizedAccountsConfig
      .filter(notEmpty)
      .map((account) => ({
        ...account,
        blockchainName: account.blockchainName.toLowerCase() as SupportedBlockchain,
        walletAddress: account.walletAddress.toLowerCase(),
      }));

    this.centralizedAccountsConfig.forEach((account) => {
      if (!SUPPORTED_PLATFORMS.includes(account.platformName)) {
        throw new Error(`Unsupported platformName for account ${JSON.stringify(account)}. Must be one of ${SUPPORTED_PLATFORMS}`);
      }
      if (Object.values(account).some((value) => !value)) {
        throw new Error(`Please add a value for each field: ${Object.keys(account)}`);
      }
    });
    this.decentralizedAccountsConfig.forEach((account) => {
      if (!SUPPORTED_BLOCKCHAINS.includes(account.blockchainName)) {
        throw new Error(`Unsupported blockchainName for account ${JSON.stringify(account)}. Must be one of ${SUPPORTED_BLOCKCHAINS}`);
      }
      if (Object.values(account).some((value) => !value)) {
        throw new Error(`Please add a value for each field: ${Object.keys(account)}`);
      }
    });
    const nicknamesCount = [
      ...this.decentralizedAccountsConfig.map((account) => account.nickname),
      ...this.centralizedAccountsConfig.map((account) => account.nickname),
    ].reduce<Record<string, number>>((memo, nickname: string) => {
      if (typeof memo[nickname] === 'number') {
        memo[nickname] += 1;
      } else {
        memo[nickname] = 1;
      }
      return memo;
    }, {});
    const duplicatedNicknames = Object.entries(nicknamesCount)
      .filter(([, occurrences]) => occurrences > 1)
      .map(([nickname]) => nickname);
    if (duplicatedNicknames.length > 0) {
      throw new Error(`Account nicknames should be unique, you re-used "${duplicatedNicknames}" multiple times`);
    }
  }

  static parse(configFilePath: string) : Account[] {
    if (!fs.existsSync(configFilePath)) {
      console.info(`Config file not found at ${configFilePath}. Creating one.`);
      const content = {
        centralizedAccountsConfig: [
          {
            platformName: 'Coinbase',
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

      fs.writeFileSync(configFilePath, JSON.stringify(content, null, 2));
      throw new Error(`No config file could be found. A default one was created at ${configFilePath}`);
    }

    const config = new Config(JSON.parse(fs.readFileSync(configFilePath, { encoding: 'utf8' })));

    const centralizedAccounts = config.centralizedAccountsConfig.map(() => null);
    const decentralizedAccounts = config.decentralizedAccountsConfig.map((accountConfig) => {
      switch (accountConfig.blockchainName) {
        case 'ethereum': return new EthereumAccount(accountConfig);
        default: throw new Error(`Blockchain name unexpected (${accountConfig.blockchainName}) for account config ${JSON.stringify(accountConfig)}`);
      }
    });
    return [...centralizedAccounts, ...decentralizedAccounts].filter(isPresent);
  }
}

export default Config;
