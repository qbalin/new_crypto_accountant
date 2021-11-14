import { SupportedBlockchain } from '../config_types';
import EthereumLikeAddress from '../addresses/ethereum_like_address';

class AtomicTransaction {
  readonly createdAt: Date;

  readonly action: string;

  readonly currency: string;

  readonly from: EthereumLikeAddress;

  readonly to: EthereumLikeAddress;

  readonly transactionHash: string;

  readonly amount: number;

  constructor({
    createdAt, action, currency, from, to, transactionHash, chain, amount,
  }: {
    createdAt: Date,
    action: string,
    currency: string,
    from: string,
    to: string,
    transactionHash: string,
    chain: SupportedBlockchain,
    amount: number,
  }) {
    this.createdAt = createdAt;
    this.action = action;
    this.currency = currency;
    this.from = new EthereumLikeAddress({ address: from, chain });
    this.to = new EthereumLikeAddress({ address: to, chain });
    this.transactionHash = transactionHash;
    this.amount = amount;
  }
}

export default AtomicTransaction;
