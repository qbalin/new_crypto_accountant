import TransactionBundle from '../models/transaction_bundle';
import CostBasisTracker from './cost_basis_tracker';

class MasterCostBasisTracker {
  private trackers: Record<string, CostBasisTracker> = {}

  accrue({ currency, entry } :
    {
      currency: string,
      entry: { amount: number, price: number, transactionBundle: TransactionBundle }
    }) {
    this.trackers[currency] ||= new CostBasisTracker();
    return this.trackers[currency].accrue(entry);
  }

  consume({ currency, amount } : { currency: string, amount: number }) {
    this.trackers[currency] ||= new CostBasisTracker();
    return this.trackers[currency].consume({ amount });
  }

  destroy({ currency, amount } : { currency: string, amount: number }) {
    this.trackers[currency] ||= new CostBasisTracker();
    return this.trackers[currency].destroy({ amount });
  }

  // transfer({ outbound, inbound } :
  //   {
  //     outbound: { currency: string, amount: number },
  //     inbound: { currency: string, amount: number }
  //   }) {
  //   const amountsAndPrices = this.consume({
  //     currency: outbound.currency,
  //     amount: outbound.amount,
  //   });
  //   const cost = amountsAndPrices.reduce((memo, { amount, price }) => memo + amount * price, 0);
  //   this.accrue({
  //     currency: inbound.currency,
  //     entry:
  //     { amount: inbound.amount, price: cost / inbound.amount },
  //   });
  // }
}

const masterCostBasisTracker = new MasterCostBasisTracker();

export default masterCostBasisTracker;
