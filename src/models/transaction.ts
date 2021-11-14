import EthereumTransaction from './ethereum_transaction';
import EthereumInternalTransaction from './ethereum_internal_transaction';

type Transaction = EthereumTransaction | EthereumInternalTransaction

export default Transaction;
