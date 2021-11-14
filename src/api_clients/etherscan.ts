import Web3 from 'web3';
import EtherscanBaseClient from './etherscan_like';
import { SupportedBlockchain } from '../config_types';

class Client extends EtherscanBaseClient {
  constructor({ etherscanLikeApiKey, infuraApiKey }:
    { etherscanLikeApiKey: string, infuraApiKey: string}) {
    const web3Instance = new Web3(
      new Web3.providers.WebsocketProvider(
        `wss://mainnet.infura.io/ws/v3/${infuraApiKey}`,
      ),
    );
    super({
      apiKey: etherscanLikeApiKey,
      baseUrl: 'https://api.etherscan.io/api',
      chainName: SupportedBlockchain.Ethereum,
      web3Instance,
    });
  }
}

export default Client;
