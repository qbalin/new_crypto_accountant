/* eslint-disable camelcase */

import BankAccountAddress from '../../addresses/bank_account_address';
import PlatformAddress from '../../addresses/platform_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedPlatform } from '../../config_types';
import AtomicTransaction, { PAY_FEE } from '../atomic_transaction';
import { ToAtomicTransactionable, TransactionBundlable } from '../model_types';
import TransactionBundle, { BundleStatus } from '../transaction_bundle';

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

class Transfer implements ToAtomicTransactionable, TransactionBundlable {
  private readonly attributes: Attributes;

  private readonly accountNickname: string;

  private atomicTransactions: AtomicTransaction[] | null;

  private readonly accountIdToCurrencyMap: Record<string, string>;

  constructor({ attributes, accountNickname, accountIdToCurrencyMap } :
    {
      attributes: Record<string, any>,
      accountNickname: string,
      accountIdToCurrencyMap: Record<string, string>
    }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'type', 'created_at', 'completed_at', 'canceled_at', 'processed_at', 'account_id', 'user_id', 'user_nonce', 'amount', 'details', 'idem']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.accountIdToCurrencyMap = accountIdToCurrencyMap;
    this.atomicTransactions = null;
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
    return parseFloat(this.attributes.amount);
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

  get subtotal() {
    return parseFloat(this.attributes.details.subtotal || '0');
  }

  get accountId() {
    return this.attributes.account_id;
  }

  get isBankTransfer() {
    return !!this.attributes.details.coinbase_payout_at;
  }

  get cryptoTransactionHash() {
    return this.attributes.details.crypto_transaction_hash?.toLowerCase();
  }

  get bundleId() {
    return `${SupportedPlatform.Coinbase}-transfer_id-${this.id}`;
  }

  transactionBundle() {
    let status;
    if (this.isBankTransfer) {
      status = BundleStatus.complete;
    } else {
      status = BundleStatus.incomplete;
    }
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions(), action: '', status, id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    if (!!this.completedAt === !!this.canceledAt) {
      throw new Error(`Transfer should be either completed or canceled: ${JSON.stringify(this)}`);
    }
    if (!this.completedAt) {
      return [];
    }
    if (!['deposit', 'withdraw'].includes(this.type)) {
      throw new Error(`Unknown type ${this.type} for transfer ${JSON.stringify(this)}`);
    }
    const currency = this.accountIdToCurrencyMap[this.accountId];
    if (!currency) {
      throw new Error(`Could not find account with id ${this.accountId} for transfer ${JSON.stringify(this)}`);
    }
    this.atomicTransactions = this.type === 'deposit' ? this.toDepositAtomicTransactions(currency) : this.toWithdrawAtomicTransaction(currency);
    return this.atomicTransactions;
  }

  private toDepositAtomicTransactions(currency: string) {
    if (this.fee) {
      throw new Error(`Found deposit entry with a fee. Unsupported for now. Entry: ${JSON.stringify(this)}`);
    }
    let from;
    if (this.isBankTransfer) {
      from = new BankAccountAddress();
    } else {
      from = new VoidAddress({ note: this.cryptoTransactionHash || 'Unknown address' }); // Not really void, it comes from an unknown chain
    }
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency,
        from,
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }

  private toWithdrawAtomicTransaction(currency: string) {
    let to;
    if (this.isBankTransfer) {
      to = new BankAccountAddress();
    } else {
      to = new VoidAddress({ note: this.cryptoTransactionHash || 'Unknown address' }); // Not really void, it goes to an unknown chain
    }
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '-----',
        currency,
        from: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        to,
        amount: this.subtotal || this.amount,
        bundleId: this.bundleId,
      }),
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: PAY_FEE,
        currency,
        from: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Coinbase,
        }),
        to: new VoidAddress({ note: 'Coinbase Inc.' }),
        amount: this.fee,
        bundleId: this.bundleId,
      }),
    ];
  }
}

export default Transfer;
