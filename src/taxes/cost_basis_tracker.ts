/* eslint-disable max-classes-per-file */
import TransactionBundle from '../models/transaction_bundle';
import { Heap } from '../utils';

enum CostBasisUpdateType {
  accrual = 'accrual',
  destruction = 'destruction',
  consumption = 'consumption',
}

class CostBasisTracker {
  heap: Heap<{ amount: number, price: number, transactionBundle: TransactionBundle }>;

  constructor() {
    this.heap = new Heap();
  }

  /** Crypto acquisition */
  accrue({ amount, price, transactionBundle } :
    { amount: number, price: number, transactionBundle: TransactionBundle }) {
    this.heap.push({ amount, price, transactionBundle }, price);
    return {
      amount, price, transactionBundle, type: CostBasisUpdateType.accrual,
    };
  }

  /** Crypto disposal */
  consume({ amount } : { amount: number }) : {
    amount: number,
    price: number,
    notes: string[],
    transactionBundle: null | TransactionBundle,
    type: CostBasisUpdateType
  }[] {
    let amountToConsume = amount;
    let element = this.heap.peek();
    const amountsAndPrices = [];

    while (element && element.amount < amountToConsume) {
      amountsAndPrices.push(
        {
          ...this.heap.pop() as {
            amount: number,
            price: number,
            notes: [],
            transactionBundle: TransactionBundle
          },
          type: CostBasisUpdateType.consumption,
        },
      );
      amountToConsume -= element.amount;
      element = this.heap.peek();
    }

    if (element) {
      element.amount -= amountToConsume;
      amountsAndPrices.push({
        amount: amountToConsume,
        price: element.price,
        notes: [] as string[],
        transactionBundle: element.transactionBundle,
        type: CostBasisUpdateType.consumption,
      });
    } else {
      amountsAndPrices.push({
        amount: amountToConsume,
        price: 0,
        notes: ['Consumed more than was accrued.'],
        transactionBundle: null,
        type: CostBasisUpdateType.consumption,
      });
    }

    return amountsAndPrices;
  }

  /** Remove crypto amount from holding
   *
   * This method can be applied to fees, see Method 1 of:
   * https://koinly.io/blog/deducting-crypto-trading-transfer-fees/#transfer-fees-not-as-straightforward
   *
   * If 10 XXX were bought for $10, and later transferred for a fee of 1 XXX, this method considers
   * that the cost basis is unchanged, so the 9 XXX left still have a cost of $10.
   *
   * Keeping the cost basis high is more advantageous tax-wise, but is potentially non-compliant.
   */
  destroy({ amount } : { amount: number }) {
    let amountToDestroy = amount;
    let element = this.heap.peek();
    let cost = 0;
    const elementsDestroyed = [];
    while (element && element.amount <= amountToDestroy) {
      element.price = (element.price * element.amount + cost) / element.amount;
      cost = element.price * element.amount;
      elementsDestroyed.push(
        {
          ...this.heap.pop() as {
            amount: number,
             price: number,
              transactionBundle: TransactionBundle
          },
          type: CostBasisUpdateType.destruction,
        },
      );
      amountToDestroy -= element.amount;
      element = this.heap.peek();
    }
    if (!element) {
      elementsDestroyed.push({
        price: 0, amount: amountToDestroy, notes: ['Destroyed more than was accrued.'], type: CostBasisUpdateType.destruction,
      });
    } else {
      cost = element.price * element.amount;
      element.amount -= amountToDestroy;
      element.price = cost / element.amount;
      elementsDestroyed.push({
        price: element.price,
        amount: amountToDestroy,
        transactionBundle: element.transactionBundle,
        type: CostBasisUpdateType.destruction,
      });
    }

    return elementsDestroyed;
  }
}

export default CostBasisTracker;
