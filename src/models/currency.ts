import coingeckoClient from '../api_clients/coingecko';

// eslint-disable-next-line no-use-before-define
const instances: Record<string, Currency> = {};

class Currency {
  ticker: string;

  private constructor({ ticker } : { ticker: string }) {
    this.ticker = ticker;
  }

  static getInstance({ ticker } : { ticker: string }) {
    if (instances[ticker]) {
      return instances[ticker];
    }
    instances[ticker] = new Currency({ ticker });
    return instances[ticker];
  }

  get isFiat() {
    return ['USD', 'EUR'].includes(this.ticker);
  }

  async getPrice({ at = new Date() } : { at?: Date } = {}) {
    if (this.isFiat) {
      return 1;
    }
    return coingeckoClient.getPrice({ ticker: this.ticker, at });
  }
}

export default Currency;
