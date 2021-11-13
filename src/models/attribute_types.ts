import EthereumTransaction from './ethereum_transaction';

export type EthereumTransactionAttributes = Record<
  typeof EthereumTransaction.attributesList[number],
  string
>
