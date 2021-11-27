/* eslint-disable camelcase */
// @ts-ignore
import { addressesFromExtPubKey } from '@swan-bitcoin/xpub-lib';
import { fetchJson } from '../utils';

interface Transaction {
  txid: string,
  vin: { prevout: { scriptpubkey_address: string } }[],
  vout: { scriptpubkey_address: string }[],
  status: {
    block_time: number
  }
}

class BlockstreamClient {
  private readonly extPubKey: string;

  private readonly baseUrl = 'https://blockstream.info/api';

  constructor({ extPubKey } : { extPubKey: string }) {
    this.extPubKey = extPubKey;
  }

  async getTransactions({ since = new Date('1970'), addressGapLimit = 20 } : { since?: Date, addressGapLimit?: number}) {
    // It's important to index transactions by id to avoid duplicates.
    // For example, A and B are controlled addresses.
    // - A receives 1BTC in tx1
    // - B receives 2BTC in tx2
    // - 3 BTC are sent from A and B to an external address (non-controlled) in tx3
    // When scraping transactions for addresses A and B, tx3 will be counted twice if
    // we don't index by txid.
    const transactions = {} as Record<string, Transaction>;
    let addressCount = 100;
    let currentAddressIndex = 0;
    let addressGap = 0;
    let addresses = addressesFromExtPubKey({ extPubKey: this.extPubKey, network: 'mainnet', addressCount })
      .map((a: { address: string }) => a.address);

    do {
      const currentAddress = addresses[currentAddressIndex];
      // eslint-disable-next-line no-await-in-loop
      const newTransactions = await this.getTransactionsForAddress(currentAddress);

      // eslint-disable-next-line no-loop-func
      newTransactions.forEach((t: Transaction) => {
        // eslint-disable-next-line no-param-reassign
        t.vin = t.vin.filter((inObj) => addresses
          .includes(inObj.prevout.scriptpubkey_address));
        // eslint-disable-next-line no-param-reassign
        t.vout = t.vout.filter((outObj) => addresses.includes(outObj.scriptpubkey_address));

        transactions[t.txid] = t;
      });
      if (newTransactions.length === 0) {
        addressGap += 1;
      }
      currentAddressIndex += 1;
      if (currentAddressIndex === addresses.length) {
        addressCount += 100;
        addresses = addressesFromExtPubKey({ extPubKey: this.extPubKey, network: 'mainnet', addressCount })
          .map((a: { address: string }) => a.address);
      }
    } while (addressGap < addressGapLimit);

    return Object.values(transactions).filter((t) => +new Date(t.status.block_time) >= +since);
  }

  private async getTransactionsForAddress(address: string) {
    const url = new URL(`${this.baseUrl}/address/${address}/txs/chain`);
    const transactions = [];
    let oldestTransactionId;

    do {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await fetchJson({ url: url.href });
      transactions.push(...data);
      oldestTransactionId = data[data.length]?.txid;
    } while (oldestTransactionId);

    return transactions;
  }
}

export default BlockstreamClient;
