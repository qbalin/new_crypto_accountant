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
      Model,
    }: {
      accountIndentifier: string,
      blockchainExplorerClient: EtherscanBase,
      walletAddress: string,
      Model: new ({ attributes }: { attributes: Record<string, any>}) => Type,
    }) => {
      const transactions = loader.load({ path: `./downloads/${accountIndentifier}-txlist.json`, Model });
      transactions.sort((a, b) => +a.timeStamp - +b.timeStamp);
      const firstTimeStamp = transactions[0]?.timeStamp || new Date();
      const lastTimeStamp = transactions[transactions.length - 1]?.timeStamp || new Date();

      const previousTransactions = (await blockchainExplorerClient.call({ requestPath: `?module=account&action=txlist&address=${walletAddress}`, until: new Date(+firstTimeStamp - 1) })).map((attributes) => new Model({ attributes }));
      const laterTransactions = (await blockchainExplorerClient.call({ requestPath: `?module=account&action=txlist&address=${walletAddress}`, since: new Date(+lastTimeStamp + 1) })).map((attributes) => new Model({ attributes }));

      const allTransactions = [...transactions, ...previousTransactions, ...laterTransactions];
      loader.save({ path: `./downloads/${accountIndentifier}-txlist.json`, collection: allTransactions });
      return allTransactions;
    },
  },
};
