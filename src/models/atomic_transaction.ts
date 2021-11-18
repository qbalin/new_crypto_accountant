import { SupportedBlockchain, SupportedPlatform } from '../config_types';
import EthereumLikeAddress from '../addresses/ethereum_like_address';
import PlatformAddress from '../addresses/platform_address';
import Address from '../addresses/address';

class AtomicTransaction {
  readonly createdAt: Date;

  readonly action: string;

  readonly currency: string;

  readonly from: Address;

  readonly to: Address;

  readonly transactionHash: string;

  readonly amount: number;

  constructor({
    createdAt, action, currency, from, to, transactionHash, chain, amount, platform,
  }: {
    createdAt: Date,
    action: string,
    currency: string,
    from: string,
    to: string,
    transactionHash: string,
    amount: number,
    chain?: SupportedBlockchain,
    platform?: SupportedPlatform,
  }) {
    this.createdAt = createdAt;
    this.action = action;
    this.currency = currency;
    this.transactionHash = transactionHash;
    this.amount = amount;

    if (chain) {
      this.from = new EthereumLikeAddress({ address: from, chain });
      this.to = new EthereumLikeAddress({ address: to, chain });
    } else if (platform) {
      this.from = new PlatformAddress({ nickname: from, platform });
      this.to = new PlatformAddress({
        nickname: to,
        platform,
      });
    } else {
      throw new Error('Cannot instantiate AtomicTransaction without chain or platform info');
    }
  }
}

export default AtomicTransaction;
