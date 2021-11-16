/* eslint-disable camelcase */

interface Details1 {
  readonly fee: string,
  readonly subtotal: string,
  readonly sent_to_address: string,
  readonly coinbase_account_id: string,
  readonly coinbase_withdrawal_id: string,
  readonly coinbase_transaction_id: string,
  readonly crypto_transaction_hash: string,
  readonly coinbase_payment_method_id: string,
}

interface Details2 {
  readonly fee: string
  readonly subtotal: string
  readonly cancel_code: string
  readonly sent_to_address: string
  readonly coinbase_account_id: string
  readonly coinbase_payment_method_id: string
}

interface Details3 {
  readonly is_instant_usd: string
  readonly coinbase_payout_at: string
  readonly coinbase_account_id: string
  readonly coinbase_deposit_id: string
  readonly coinbase_transaction_id: string
  readonly coinbase_payment_method_id: string
  readonly coinbase_payment_method_type: string
}

interface Details4 {
  readonly fee: string
  readonly subtotal: string
  readonly sent_to_address: string
  readonly coinbase_account_id: string
  readonly coinbase_withdrawal_id: string
  readonly coinbase_transaction_id: string
  readonly crypto_transaction_hash: string
  readonly coinbase_payment_method_id: string
}

interface Attributes {
  readonly id: string
  readonly type: string
  readonly created_at: string
  readonly completed_at: string
  readonly canceled_at: string
  readonly processed_at: string
  readonly account_id: string
  readonly user_id: string
  readonly user_nonce: string
  readonly amount: string
  readonly details: Details1 | Details2 | Details3 | Details4
  readonly idem: null
}

class Transfer {
  private readonly attributes: Attributes;

  constructor({ attributes } : { attributes: Record<string, any> }) {
    const attributesPassed = new Set(Object.keys(attributes));
    const attributesRequired = new Set(['id', 'type', 'created_at', 'completed_at', 'canceled_at', 'processed_at', 'account_id', 'user_id', 'user_nonce', 'amount', 'details', 'idem']);
    if (attributesPassed.size + attributesRequired.size
      !== new Set([Array.from(attributesPassed), Array.from(attributesRequired)]).size
    ) {
      throw new Error(`expected to find exactly ${Array.from(attributesRequired)} in ${Object.keys(attributes)}`);
    }

    this.attributes = attributes as Attributes;
  }

  get id() {
    return this.attributes.id;
  }

  get created_at() {
    return new Date(this.attributes.created_at);
  }

  get amount() {
    return parseInt(this.attributes.amount, 10);
  }

  toJson() {
    return this.attributes;
  }
}

export default Transfer;
