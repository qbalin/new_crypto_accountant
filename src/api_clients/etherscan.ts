import Web3 from 'web3';
import EtherscanBaseClient from './etherscan_base.js';

class Client extends EtherscanBaseClient {
  constructor({ etherscanApiKey, infuraApiKey }: { etherscanApiKey: string, infuraApiKey: string}) {
    const web3Instance = new Web3(
      new Web3.providers.WebsocketProvider(
        `wss://mainnet.infura.io/ws/v3/${infuraApiKey}`,
      ),
    );
    super({
      apiKey: etherscanApiKey,
      baseUrl: 'https://api.etherscan.io/api',
      chainName: 'ethereum_mainnet',
      web3Instance,
    });
  }
}

export default Client;
