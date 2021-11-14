import Loader from './loader';
import EtherscanBase from '../api_clients/etherscan_like';

export default {
  ETHERSCAN_LIKE: {
    diskNetwork: async ({
      accountIndentifier,
      blockchainExplorerClient,
      walletAddress,
      action,
    }: {
      accountIndentifier: string,
      blockchainExplorerClient: EtherscanBase,
      walletAddress: string,
      action: string,
    }) => {
      const group = `${accountIndentifier}-${action}`;
      const transactions = Loader.load({ group }) as { timeStamp: string }[];
      transactions.sort((a, b) => +a.timeStamp - +b.timeStamp);
      const firstTimeStamp = transactions[0]?.timeStamp || new Date();
      const lastTimeStamp = transactions[transactions.length - 1]?.timeStamp || new Date();

      console.log('transactions', transactions);

      const previousTransactions = (await blockchainExplorerClient.call({ requestPath: `?module=account&action=${action}&address=${walletAddress}`, until: new Date(+firstTimeStamp - 1) }));
      const laterTransactions = (await blockchainExplorerClient.call({ requestPath: `?module=account&action=${action}&address=${walletAddress}`, since: new Date(+lastTimeStamp + 1) }));
      console.log('previousTransactions', previousTransactions);

      const allTransactions = [...transactions, ...previousTransactions, ...laterTransactions];
      Loader.save({ group, collection: allTransactions });
      return transactions;
    },
  },
};
