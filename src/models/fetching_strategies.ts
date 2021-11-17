/* eslint-disable camelcase */
import Loader from './loader';
import EtherscanBaseClient from '../api_clients/etherscan_like';
import CoinbaseClient from '../api_clients/coinbase';

export default {
  ETHERSCAN_LIKE: {
    diskNetwork: async ({
      accountIndentifier,
      apiClient,
      walletAddress,
      action,
    }: {
      accountIndentifier: string,
      apiClient: EtherscanBaseClient,
      walletAddress: string,
      action: string,
    }) => {
      const group = `${accountIndentifier}-${action}`;
      const records = (Loader.load({ group }) as { timeStamp: string }[])
        .sort((a, b) => +a.timeStamp - +b.timeStamp);

      const lastTimeStamp = records[records.length - 1]?.timeStamp || new Date(0);
      const laterRecords = (await apiClient.call({ requestPath: `?module=account&action=${action}&address=${walletAddress}`, since: new Date(+lastTimeStamp + 1) }));

      const allRecords = [...records, ...laterRecords];
      Loader.save({ group, collection: allRecords });
      return records;
    },
  },
  COINBASE: {
    diskNetworkForTimelessRecords: async ({
      accountIndentifier, action, apiClient, forceRefetch = false,
    } :
      {
        accountIndentifier: string,
        action: string,
        apiClient: CoinbaseClient,
        forceRefetch?: boolean
       }) => {
      const group = `${accountIndentifier}-${action}`;
      let records = Loader.load({ group });

      if (records.length === 0 || forceRefetch) {
        records = [...await apiClient.call({ requestPath: `/${action}` })];
      }

      Loader.save({ group, collection: records });

      return records;
    },
    diskNetworkForTimedRecords: async ({
      accountIndentifier, action, iterationParams, apiClient,
    } :
      {
        accountIndentifier: string,
        action: string,
        iterationParams?: { key: string, values: string[]},
        apiClient: CoinbaseClient,
       }) => {
      const group = `${accountIndentifier}-${action}`;
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

  },
};
