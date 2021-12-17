import PlatformAddress from '../../addresses/platform_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedPlatform } from '../../config_types';
import AtomicTransaction from '../atomic_transaction';
import Currency from '../currency';
import { ToAtomicTransactionable, TransactionBundlable } from '../model_types';
import TransactionBundle, { BundleAction, BundleStatus } from '../transaction_bundle';

/* eslint-disable camelcase */
interface Attributes {
  id: string,
  datetime: string,
  transactionType: 'interest' | 'deposit' | 'withdrawal' | 'promo_code_reward',
  coinType: string,
  coinAmount: string,
  usdValue: string,
  originalInterestCoin: string,
  interestAmountInOriginalCoin: string,
  confirmed: string
}

class CelsiusRecord implements ToAtomicTransactionable, TransactionBundlable {
  private readonly attributes: Attributes;

  private readonly accountNickname: string;

  private atomicTransactions: AtomicTransaction[] | null

  constructor({ attributes, accountNickname } :
    { attributes: Record<string, any>, accountNickname: string }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'datetime', 'transactionType', 'coinType', 'coinAmount', 'usdValue', 'originalInterestCoin', 'interestAmountInOriginalCoin', 'confirmed']);
    if ((attributesPassed.size + attributesRequired.size) / 2
      !== new Set([...Array.from(attributesPassed), ...Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.atomicTransactions = null;
    this.accountNickname = accountNickname;
    this.attributes = attributes as Attributes;
  }

  get id() {
    return this.attributes.id;
  }

  get amount() {
    return Math.abs(parseFloat(this.attributes.coinAmount));
  }

  get createdAt() {
    return new Date(this.attributes.datetime);
  }

  get bundleId() {
    return `${SupportedPlatform.Celsius}-record_id-${this.id}`;
  }

  get transactionType() {
    return this.attributes.transactionType;
  }

  get currency() {
    return this.attributes.coinType;
  }

  transactionBundle() {
    let action;
    let status;
    switch (this.transactionType) {
      case 'interest':
      case 'promo_code_reward':
        action = BundleAction.getFree;
        status = BundleStatus.complete;
        break;
      case 'deposit':
      case 'withdrawal':
        action = BundleAction.transfer;
        status = BundleStatus.incomplete;
        break;
      default:
        throw new Error(`Unexpected transactionType for Celsius record: ${JSON.stringify(this, null, 2)}`);
    }

    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions(),
      action,
      status,
      id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }

    switch (this.transactionType) {
      case 'interest':
      case 'promo_code_reward':
        this.atomicTransactions = this.reward();
        break;
      case 'deposit':
        this.atomicTransactions = this.deposit();
        break;
      case 'withdrawal':
        this.atomicTransactions = this.withdrawal();
        break;
      default:
        throw new Error(`Unexpected transactionType for Celsius record: ${JSON.stringify(this, null, 2)}`);
    }

    return this.atomicTransactions;
  }

  reward() {
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '--------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: VoidAddress.getInstance({ note: 'Celsius' }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Celsius,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }

  withdrawal() {
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '--------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Celsius,
        }),
        to: VoidAddress.getInstance({ note: `Other ${this.currency} address` }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }

  deposit() {
    return [
      new AtomicTransaction({
        createdAt: this.createdAt,
        action: '--------',
        currency: Currency.getInstance({ ticker: this.currency }),
        from: VoidAddress.getInstance({ note: `Other ${this.currency} address` }),
        to: PlatformAddress.getInstance({
          nickname: this.accountNickname,
          platform: SupportedPlatform.Celsius,
        }),
        amount: this.amount,
        bundleId: this.bundleId,
      }),
    ];
  }
}

export default CelsiusRecord;
