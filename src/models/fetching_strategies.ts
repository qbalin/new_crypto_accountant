import Loader from './loader';
import EtherscanBase from '../api_clients/etherscan_base';

const loader = new Loader();

interface Transaction {
  timeStamp: Date,
  toJson: () => Record<string, any>
}

export default {
  ETHERSCAN_LIKE: {
    cacheDiskNetwork: async <Type extends Transaction>({
      accountIndentifier,
      blockchainExplorerClient,
      walletAddress,
      action,
      Model,
    }: {
      accountIndentifier: string,
      blockchainExplorerClient: EtherscanBase,
      walletAddress: string,
      action: string,
      Model: new ({ attributes }: { attributes: Record<string, any>}) => Type,
    }) => {
      const group = `${accountIndentifier}-${action}`;
      const transactions = loader.load({ group, Model });
      transactions.sort((a, b) => +a.timeStamp - +b.timeStamp);
      const firstTimeStamp = transactions[0]?.timeStamp || new Date();
      const lastTimeStamp = transactions[transactions.length - 1]?.timeStamp || new Date();

      const previousTransactions = (await blockchainExplorerClient.call({ requestPath: `?module=account&action=${action}&address=${walletAddress}`, until: new Date(+firstTimeStamp - 1) })).map((attributes) => new Model({ attributes }));
      const laterTransactions = (await blockchainExplorerClient.call({ requestPath: `?module=account&action=${action}&address=${walletAddress}`, since: new Date(+lastTimeStamp + 1) })).map((attributes) => new Model({ attributes }));

      const allTransactions = [...transactions, ...previousTransactions, ...laterTransactions];
      loader.save({ group, collection: allTransactions });
      return allTransactions;
    },
  },
};
