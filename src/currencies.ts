import { SupportedBlockchain } from './config_types';

enum ChainCoin {
  Ethereum = 'ETH',
  Polygon = 'MATIC',
  Algorand = 'ALGO'
}

const chainToCoinMap = {
  [SupportedBlockchain.Algorand]: ChainCoin.Algorand,
  [SupportedBlockchain.Ethereum]: ChainCoin.Ethereum,
  [SupportedBlockchain.Polygon]: ChainCoin.Polygon,
};

export default chainToCoinMap;
