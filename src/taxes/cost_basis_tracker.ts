import { Heap } from '../utils';

class CostBasisTracker {
  heap: Heap<{ amount: number, price: number }>;

  constructor() {
    this.heap = new Heap();
  }

  /** Crypto acquisition */
  accrue({ amount, price } : { amount: number, price: number }) {
    this.heap.push({ amount, price }, price);
  }

  /** Crypto disposal */
  consume({ amount } : { amount: number }) {
    let amountToConsume = amount;
    let element = this.heap.peek();
    const amountsAndPrices = [];

    while (element && element.amount < amountToConsume) {
      amountsAndPrices.push({ amount: element.amount, price: element.price });
      this.heap.pop();
      amountToConsume -= element.amount;
      element = this.heap.peek();
    }

    if (element) {
      element.amount -= amountToConsume;
      amountsAndPrices.push({ amount: amountToConsume, price: element.price });
    } else {
      amountsAndPrices.push({ amount: amountToConsume, price: 0 });
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
    while (element && element.amount <= amountToDestroy) {
      element.price = (element.price * element.amount + cost) / element.amount;
      cost = element.price * element.amount;
      this.heap.pop();
      amountToDestroy -= element.amount;
      element = this.heap.peek();
    }
    if (!element) {
      return;
    }
    cost = element.price * element.amount;
    element.amount -= amountToDestroy;
    element.price = cost / element.amount;
  }
}

export default CostBasisTracker;
