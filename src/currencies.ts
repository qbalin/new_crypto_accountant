import { SupportedBlockchain } from './config_types';

enum ChainCoin {
  Ethereum = 'ETH',
  Polygon = 'MATIC',
  Algorand = 'ALGO',
  Bitcoin = 'BTC'
}

const chainToCoinMap = {
  [SupportedBlockchain.Algorand]: ChainCoin.Algorand,
  [SupportedBlockchain.Ethereum]: ChainCoin.Ethereum,
  [SupportedBlockchain.Polygon]: ChainCoin.Polygon,
  [SupportedBlockchain.Bitcoin]: ChainCoin.Bitcoin,
};

export default chainToCoinMap;
