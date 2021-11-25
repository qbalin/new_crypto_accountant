/* eslint-disable camelcase */
import Loader from './loader';
import EtherscanBaseClient from '../api_clients/etherscan_like';
import CoinbaseClient from '../api_clients/coinbase';

export default {
  ETHERSCAN_LIKE: {
    diskNetwork: async ({
      accountIdentifier,
      apiClient,
      walletAddress,
      action,
    }: {
      accountIdentifier: string,
      apiClient: EtherscanBaseClient,
      walletAddress: string,
      action: string,
    }) => {
      const group = `${accountIdentifier}-${action}`;
      const records = (Loader.load({ group }) as { timeStamp: string }[])
        .sort((a, b) => +a.timeStamp - +b.timeStamp);

      const lastTimeStamp = +(records[records.length - 1]?.timeStamp || '0') * 1000;
      const laterRecords = (await apiClient.call({ requestPath: `?module=account&action=${action}&address=${walletAddress}`, since: new Date(lastTimeStamp + 1) }));

      const allRecords = [...records, ...laterRecords];
      Loader.save({ group, collection: allRecords });
      return allRecords;
    },
  },
  COINBASE: {
    diskNetworkForTimelessRecords: async ({
      accountIdentifier, action, apiClient, forceRefetch = false,
    } :
      {
        accountIdentifier: string,
        action: string,
        apiClient: CoinbaseClient,
        forceRefetch?: boolean
       }) => {
      const group = `${accountIdentifier}-${action}`;
      let records = Loader.load({ group });

      if (records.length === 0 || forceRefetch) {
        records = [...await apiClient.call({ requestPath: `/${action}` })];
      }

      Loader.save({ group, collection: records });

      return records;
    },
    diskNetworkForTimedRecords: async ({
      accountIdentifier, action, iterationParams, apiClient,
    } :
      {
        accountIdentifier: string,
        action: string,
        iterationParams?: { key: string, values: string[]},
        apiClient: CoinbaseClient,
       }) => {
      const group = `${accountIdentifier}-${action}`;
      const records = (Loader.load({ group }) as { created_at: string }[])
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      const lastTimeStamp = new Date(records[records.length - 1]?.created_at || 0);

      let laterRecords = Promise.resolve([]);
      if (iterationParams) {
        iterationParams.values.forEach((value) => {
          laterRecords = laterRecords.then(async (result) => result.concat(await apiClient.call({ requestPath: `/${action}?${iterationParams.key}=${value}`, since: new Date(+lastTimeStamp + 1) })));
        });
      } else {
        laterRecords = apiClient.call({ requestPath: `/${action}`, since: new Date(+lastTimeStamp + 1) });
      }

      const allRecords = [...records, ...(await laterRecords)];
      Loader.save({ group, collection: allRecords });
      return allRecords;
    },
    diskForTimedRecords: async ({
      accountIdentifier, action,
    } :
      {
        accountIdentifier: string,
        action: string,
       }) => {
      const group = `${accountIdentifier}-${action}`;
      return (Loader.load({ group }) as { created_at: string }[])
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    },

  },
  ALGORAND: {
    diskNetwork: async (
      {
        accountIdentifier,
        fetchMethod,
      } :
      {
        accountIdentifier: string,
        fetchMethod: ({ since }: { since: Date }) => Promise<Record<string, any>[]>,
      },
    ) => {
      const group = `${accountIdentifier}-transactions`;
      const records = (Loader.load({ group }) as { 'round-time': number }[])
        .sort((a, b) => +new Date(a['round-time'] * 1000) - +new Date(b['round-time'] * 1000));
      const lastTimeStamp = new Date(records[records.length - 1]?.['round-time'] * 1000 || 0);
      const laterRecords = await fetchMethod({ since: new Date(+lastTimeStamp + 1) });
      const allRecords = [...records, ...laterRecords];
      Loader.save({ group, collection: allRecords });
      return allRecords;
    },

  },
};
