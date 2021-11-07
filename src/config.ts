/* eslint-disable no-param-reassign */
import fs from 'fs';

const configFilePath = './config.json';
const SUPPORTED_PLATFORMS = ['kucoin', 'coinbase', 'binance'];
const SUPPORTED_BLOCKCHAINS = ['ethereum', 'polygon', 'binancesmartchain'];

interface CentralizedAccountConfig {
  readonly platformName: string
  readonly privateApiKey: string
  readonly nickname: string
}

interface DecentralizedAccountConfig {
  readonly blockchainName: string
  readonly privateApiKey: string
  readonly walletAddress: string
  readonly nickname: string
}

export interface AccountsConfiguration {
  centralizedAccounts: Array<CentralizedAccountConfig>
  decentralizedAccounts: Array<DecentralizedAccountConfig>
}

const notEmpty = (object: { [key: string]: any }) : boolean => Object.keys(object).length > 0;

class Config {
  readonly centralizedAccounts: Array<CentralizedAccountConfig>

  readonly decentralizedAccounts: Array<DecentralizedAccountConfig>

  constructor({ centralizedAccounts, decentralizedAccounts }: AccountsConfiguration) {
    this.centralizedAccounts = centralizedAccounts
      .filter(notEmpty)
      .map((account) => ({
        ...account,
        platformName: account.platformName.toLowerCase(),
      }));
    this.decentralizedAccounts = decentralizedAccounts
      .filter(notEmpty)
      .map((account) => ({
        ...account,
        blockchainName: account.blockchainName.toLowerCase(),
        walletAddress: account.walletAddress.toLowerCase(),
      }));

    this.centralizedAccounts.forEach((account) => {
      if (!SUPPORTED_PLATFORMS.includes(account.platformName)) {
        throw new Error(`Unsupported platformName for account ${JSON.stringify(account)}. Must be one of ${SUPPORTED_PLATFORMS}`);
      }
      if (Object.values(account).some((value) => !value)) {
        throw new Error(`Please add a value for each field: ${Object.keys(account)}`);
      }
    });
    this.decentralizedAccounts.forEach((account) => {
      if (!SUPPORTED_BLOCKCHAINS.includes(account.blockchainName)) {
        throw new Error(`Unsupported blockchainName for account ${JSON.stringify(account)}. Must be one of ${SUPPORTED_BLOCKCHAINS}`);
      }
      if (Object.values(account).some((value) => !value)) {
        throw new Error(`Please add a value for each field: ${Object.keys(account)}`);
      }
    });
    const nicknamesCount = [
      ...this.decentralizedAccounts.map((account) => account.nickname),
      ...this.centralizedAccounts.map((account) => account.nickname),
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

  static parse() : Config {
    if (!fs.existsSync(configFilePath)) {
      console.info(`Config file not found at ${configFilePath}. Creating one.`);
      const content = {
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

      fs.writeFileSync(configFilePath, JSON.stringify(content, null, 2));
    }
    return new Config(JSON.parse(fs.readFileSync(configFilePath, { encoding: 'utf8' })));
  }
}

export default Config;
