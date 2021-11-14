import EtherscanLikeTransaction from './etherscan_like_transaction';
import EtherscanLikeInternalTransaction from './etherscan_like_internal_transaction';

type Transaction = EtherscanLikeTransaction | EtherscanLikeInternalTransaction

export default Transaction;
