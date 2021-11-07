import fs from 'fs';

const configFilePath = './config.json';

type supportedExchange = 'coinbase' | 'kucoin' | 'binance' | 'celsius';

interface ExchangeAccountConfig {
    exchangeName: supportedExchange,
    privateApiKey: string,
    nickname: string
}

interface BlockchainAccountConfig {
    blockchainName: string,
    privateApiKey: string,
    walletAddress: string,
    nickname: string
}

interface Configuration {
    exchangeAccounts: Array<ExchangeAccountConfig>,
    blockchainAccounts: Array<BlockchainAccountConfig>,
}

class Config {
    exchangeAccounts: Array<ExchangeAccountConfig>

    blockchainAccounts: Array<BlockchainAccountConfig>

    constructor({ exchangeAccounts, blockchainAccounts }: Configuration) {
      this.exchangeAccounts = exchangeAccounts;
      this.blockchainAccounts = blockchainAccounts;
    }

    static parse() : Config {
      if (!fs.existsSync(configFilePath)) {
        console.info(`Config file not found at ${configFilePath}. Creating one.`);
        const content = {
          exchangeAccounts: [
            {
              exchangeName: 'Coinbase or KuCoin or Binance, etc..',
              privateApiKey: 'The private API generated from your account. Read-only is enough.',
              nickname: 'A name to recognize your account',
            },
            {

            },
          ],
          blockchainAccounts: [
            {
              blockchainName: 'Ethereum or Polygon, etc...',
              privateApiKey: 'The private API generated from your Explorer account.',
              walletAddress: 'Your public wallet address on the blockchain',
              nickname: 'A name to recognize your account',
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
