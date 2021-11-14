export enum SupportedPlatform {
  KuCoin = 'kucoin',
  Coinbase = 'coinbase',
  Binance = 'binance',
}
export enum SupportedBlockchain {
  Ethereum = 'ethereum',
  Polygon = 'polygon',
}

export interface CentralizedAccountConfig {
  readonly platformName: SupportedPlatform
  readonly privateApiKey: string
  readonly nickname: string
}

export interface DecentralizedAccountConfig {
  readonly blockchainName: SupportedBlockchain
  readonly blockchainExplorerApiKey: string
  readonly walletAddress: string
  readonly nickname: string
  readonly nodeProviderApiKey: string
}

export interface AccountsConfiguration {
  centralizedAccountsConfig: Array<CentralizedAccountConfig>
  decentralizedAccountsConfig: Array<DecentralizedAccountConfig>
}