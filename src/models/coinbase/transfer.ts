/* eslint-disable camelcase */

import BankAccountAddress from '../../addresses/bank_account_address';
import PlatformAddress from '../../addresses/platform_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedPlatform } from '../../config_types';
import AtomicTransaction from '../atomic_transaction';

interface Details {
  readonly fee?: string,
  readonly subtotal?: string,
  readonly cancel_code?: string
  readonly is_instant_usd?: string
  readonly sent_to_address?: string,
  readonly coinbase_payout_at?: string
  readonly coinbase_account_id: string,
  readonly coinbase_deposit_id?: string
  readonly coinbase_withdrawal_id?: string,
  readonly coinbase_transaction_id?: string,
  readonly crypto_transaction_hash?: string,
  readonly coinbase_payment_method_id: string,
  readonly coinbase_payment_method_type?: string
}

interface Attributes {
  readonly id: string
  readonly type: 'deposit' | 'withdraw'
  readonly created_at: string
  readonly completed_at: string | null
  readonly canceled_at: string | null
  readonly processed_at: string | null
  readonly account_id: string
  readonly user_id: string
  readonly user_nonce: string
  readonly amount: string
  readonly details: Details
  readonly idem: null
}

class Transfer {
  private readonly attributes: Attributes;

  private readonly accountNickname: string;

  constructor({ attributes, accountNickname } :
    { attributes: Record<string, any>, accountNickname: string }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'type', 'created_at', 'completed_at', 'canceled_at', 'processed_at', 'account_id', 'user_id', 'user_nonce', 'amount', 'details', 'idem']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.accountNickname = accountNickname;
    this.attributes = attributes as Attributes;
  }

  get id() {
    return this.attributes.id;
  }

  get createdAt() {
    return new Date(this.attributes.created_at);
  }

  get completedAt() {
    return this.attributes.completed_at && new Date(this.attributes.completed_at);
  }

  get canceledAt() {
    return this.attributes.canceled_at && new Date(this.attributes.canceled_at);
  }

  get amount() {
    return parseInt(this.attributes.amount, 10);
  }

  get type() {
    return this.attributes.type;
  }

  get fee() {
    if (this.attributes.details.fee) {
      return parseFloat(this.attributes.details.fee);
    }
    return 0;
  }

  get accountId() {
    return this.attributes.account_id;
  }

  toJson() {
    return this.attributes;
  }

  toAtomicTransactions(accountIdToCurrencyMap: Record<string, string>) {
    if (!!this.completedAt === !!this.canceledAt) {
      throw new Error(`Transfer should be either completed or canceled: ${JSON.stringify(this.toJson())}`);
    }
    if (!this.completedAt) {
      return [];
    }
    if (!['deposit', 'withdraw'].includes(this.type)) {
      throw new Error(`Unknown type ${this.type} for transfer ${JSON.stringify(this.toJson())}`);
    }
    const currency = accountIdToCurrencyMap[this.accountId];
    if (!currency) {
      throw new Error(`Could not find account with id ${this.accountId} for transfer ${JSON.stringify(this.toJson())}`);
    }
    return this.type === 'deposit' ? this.toDepositAtomicTransactions(currency) : this.toWithdrawAtomicTransaction(currency);
  }

  private toDepositAtomicTransactions(currency: string) {
    if (this.fee) {
      throw new Error(`Found deposit entry with a fee. Unsupported for now. Entry: ${JSON.stringify(this.toJson())}`);
    }
    let from;
    if (this.attributes.details.coinbase_payout_at) {
      from = new BankAccountAddress();
    } else {
      from = new VoidAddress(); // Not really void, it comes from an unknown chain
    }
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency,
        from,
        to: new PlatformAddress({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        amount: this.amount,
        transactionHash: this.attributes.details.crypto_transaction_hash,
      }),
    ];
  }

  private toWithdrawAtomicTransaction(currency: string) {
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency,
        from: new PlatformAddress({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        to: new VoidAddress(), // Not really void, it goes to an unknown chain
        amount: this.amount,
        transactionHash: this.attributes.details.crypto_transaction_hash,
      }),
    ];
  }
}

export default Transfer;
