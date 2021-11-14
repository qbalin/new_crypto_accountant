import { SupportedBlockchain } from './config_types';

enum ChainCoin {
  Ethereum = 'ETH',
  Polygon = 'MATIC',
}

const chainToCoinMap = {
  [SupportedBlockchain.Ethereum]: ChainCoin.Ethereum,
  [SupportedBlockchain.Polygon]: ChainCoin.Polygon,
};

export default chainToCoinMap;
