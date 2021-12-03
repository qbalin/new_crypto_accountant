/* eslint-disable camelcase */
import DecentralizedAddress from '../../addresses/decentralized_address';
import VoidAddress from '../../addresses/void_address';
import { SupportedBlockchain } from '../../config_types';
import chainToCoinMap from '../../currencies';
import AtomicTransaction, { PAY_FEE } from '../atomic_transaction';
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

  get createdAt() {
    return new Date(this.attributes.status.block_time * 1000);
  }

  get bundleId() {
    return `${SupportedBlockchain.Bitcoin}-transaction-${this.attributes.txid}`;
  }

  transactionBundle() {
    return new TransactionBundle({
      atomicTransactions: this.toAtomicTransactions(),
      action: BundleAction.transfer,
      status: BundleStatus.incomplete,
      id: this.bundleId,
    });
  }

  toAtomicTransactions() {
    if (this.atomicTransactions) {
      return this.atomicTransactions;
    }
    this.atomicTransactions = this.attributes.vin.map((inObj) => new AtomicTransaction({
      createdAt: this.createdAt,
      action: '----',
      currency: chainToCoinMap[SupportedBlockchain.Bitcoin],
      from: this.controlledAddress,
      to: new VoidAddress({ note: 'Other BTC address' }),
      amount: inObj.prevout.value * 1e-8,
      bundleId: this.bundleId,
    }));
    if (this.attributes.vin.length) {
      this.atomicTransactions.push(new AtomicTransaction({
        createdAt: this.createdAt,
        action: PAY_FEE,
        currency: chainToCoinMap[SupportedBlockchain.Bitcoin],
        from: this.controlledAddress,
        to: new VoidAddress({ note: 'Miner' }),
        amount: this.attributes.fee * 1e-8,
        bundleId: this.bundleId,
      }));
    }
    this.atomicTransactions.push(...this.attributes.vout.map((outObj) => new AtomicTransaction({
      createdAt: this.createdAt,
      action: '-----',
      currency: chainToCoinMap[SupportedBlockchain.Bitcoin],
      from: new VoidAddress({ note: 'Other BTC address' }),
      to: this.controlledAddress,
      amount: outObj.value * 1e-8,
      bundleId: this.bundleId,
    })));

    return this.atomicTransactions;
  }
}

export default Transaction;
