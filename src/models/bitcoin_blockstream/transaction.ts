/* eslint-disable camelcase */
import DecentralizedAddress from '../../addresses/decentralized_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedBlockchain } from '../../config_types';
import chainToCoinMap from '../../currencies';
import AtomicTransaction, { PAY_FEE } from '../atomic_transaction';
import Currency from '../currency';
import TransactionBundle, { BundleAction, BundleStatus } from '../transaction_bundle';

type Vout = {
  scriptpubkey: string,
  scriptpubkey_asm: string,
  scriptpubkey_type: string,
  scriptpubkey_address: string,
  value: number,
}

type Attributes = {
  txid: string,
  version: number,
  locktime: number,
  vin: {
    txid: string,
    vout: number,
    prevout: Vout,
    scriptsig: string,
    scriptsig_asm: string,
    witness: string[],
    is_coinbase: boolean,
    sequence: number,
  }[],
  vout: Vout[],
  size: number,
  weight: number,
  fee: number,
  status: {
    confirmed: boolean,
    block_height: number,
    block_hash: string,
    block_time: number,
  }
}

class Transaction {
  private readonly attributes: Attributes

  private atomicTransactions: AtomicTransaction[] | null;

  private readonly controlledAddress: DecentralizedAddress

  constructor(
    { attributes, controlledAddress } :
    { attributes: Record<string, any>, controlledAddress: DecentralizedAddress },
  ) {
    this.atomicTransactions = null;
    this.attributes = attributes as Attributes;
    this.controlledAddress = controlledAddress;
  }

  createdAt({ minus = 0 } : { minus?: number } = {}) {
    return new Date(this.attributes.status.block_time * 1000 - minus);
  }

  get bundleId() {
    return `${SupportedBlockchain.Bitcoin}-transaction-${this.attributes.txid}`;
  }

  transactionBundle() {
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions().filter((t) => t.amount !== 0),
      action: BundleAction.transfer,
      status: BundleStatus.incomplete,
      id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }
    // The created at is not the moment the outbound transaction was received by the blockchain,
    // it's when the block was finally validated, which can strangely happen after the moment
    // when the inbound transaction was received...
    // Some explorers give the received_at time and the block time, but not blockstream. Other
    // explorers are pretty bad though.
    this.atomicTransactions = this.attributes.vin.map((inObj, index) => new AtomicTransaction({
      createdAt: this.createdAt({ minus: 60 * 60 * 1000 }),
      action: '----',
      currency: Currency.getInstance({ ticker: chainToCoinMap[SupportedBlockchain.Bitcoin] }),
      from: this.controlledAddress,
      to: VoidAddress.getInstance({ note: 'Other BTC address' }),
      // The fee is not discounted from the transaction amount, so we remove it from the first
      // outbound transaction amount.
      amount: (inObj.prevout.value - (index === 0 ? this.attributes.fee : 0)) * 1e-8,
      bundleId: this.bundleId,
    }));
    if (this.attributes.vin.length) {
      this.atomicTransactions.push(new AtomicTransaction({
        createdAt: this.createdAt({ minus: 60 * 60 * 1000 }),
        action: PAY_FEE,
        currency: Currency.getInstance({ ticker: chainToCoinMap[SupportedBlockchain.Bitcoin] }),
        from: this.controlledAddress,
        to: VoidAddress.getInstance({ note: 'Miner' }),
        amount: this.attributes.fee * 1e-8,
        bundleId: this.bundleId,
      }));
    }
    this.atomicTransactions.push(...this.attributes.vout.map((outObj) => new AtomicTransaction({
      createdAt: this.createdAt(),
      action: '-----',
      currency: Currency.getInstance({ ticker: chainToCoinMap[SupportedBlockchain.Bitcoin] }),
      from: VoidAddress.getInstance({ note: 'Other BTC address' }),
      to: this.controlledAddress,
      amount: outObj.value * 1e-8,
      bundleId: this.bundleId,
    })));

    return this.atomicTransactions;
  }
}

export default Transaction;
