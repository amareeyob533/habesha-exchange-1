// Central token configuration for Habesha Exchange.
// Prices use CoinGecko for live data; fallback static prices shown below.

export interface NetworkInfo {
  name: string
  address: string
}

// Bank withdrawal configuration (ETB cash-out to Ethiopian banks).
export const ETB_RATE = 186 // 1 USD = ~186 ETB (base rate, actual fluctuates 185-187)
export const BANKS = [
  { code: 'CBE', name: 'Commercial Bank of Ethiopia (CBE)', short: 'CBE' },
  { code: 'Telebirr', name: 'Telebirr', short: 'Telebirr' },
  { code: 'Abay Bank', name: 'Abay Bank', short: 'Abay Bank' },
  { code: 'M-PESA', name: 'M-PESA', short: 'M-PESA' },
] as const

export interface TokenConfig {
  symbol: string
  name: string
  color: string
  icon: string // emoji / glyph fallback
  iconUrl?: string // real token icon image
  price: number // USD price (fallback/initial)
  coingeckoId?: string // CoinGecko API ID for real live prices
  change24h: number // simulated % change (fallback)
  networks: NetworkInfo[] // deposit networks + wallet addresses
  listed: boolean // publicly listed
}

export const TOKENS: TokenConfig[] = [
  {
    symbol: 'USDT',
    name: 'Tether USD',
    color: '#26A17B',
    icon: '₮',
    iconUrl: '/tokens/usdt.png',
    price: 1.0,
    coingeckoId: 'tether',
    change24h: 0.01,
    networks: [
      { name: 'TRON (TRC20)', address: 'TBVhUqz5KarVFfK1k2UEALFxL6Pu8cfGHc' },
      { name: 'TON Network', address: 'UQBy0SwWKArNPiErzHpILtENz6y6GgNjPAoVTv9PGnWI8YrZ' },
      { name: 'Ethereum (ERC20)', address: '0xbec7b38f38e7e6239981d4118a69f68cfbf99f98' },
    ],
    listed: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    color: '#2775CA',
    icon: '$',
    iconUrl: '/tokens/usdc.png',
    price: 1.0,
    coingeckoId: 'usd-coin',
    change24h: -0.02,
    networks: [
      { name: 'Ethereum (ERC20)', address: '0xbec7b38f38e7e6239981d4118a69f68cfbf99f98' },
    ],
    listed: true,
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    icon: '₿',
    iconUrl: '/tokens/btc.png',
    price: 97500,
    coingeckoId: 'bitcoin',
    change24h: 2.34,
    networks: [
      { name: 'Bitcoin Network', address: '12AhGK4X4RnvdfNdsq7aQxpA4KQ2W12Wtp' },
    ],
    listed: true,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627EEA',
    icon: 'Ξ',
    iconUrl: '/tokens/eth.png',
    price: 3400,
    coingeckoId: 'ethereum',
    change24h: 3.12,
    networks: [
      { name: 'Ethereum (ERC20)', address: '0xbec7b38f38e7e6239981d4118a69f68cfbf99f98' },
    ],
    listed: true,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    color: '#9945FF',
    icon: '◎',
    iconUrl: '/tokens/sol.png',
    price: 180,
    coingeckoId: 'solana',
    change24h: 5.67,
    networks: [
      { name: 'Solana Network', address: '3peKof5MyQaxXbMZdd1uQCefewvJFTbnLFPM8QPRHLji' },
    ],
    listed: true,
  },
  {
    symbol: 'TRX',
    name: 'TRON',
    color: '#EF0027',
    icon: 'T',
    iconUrl: '/tokens/trx.png',
    price: 0.24,
    coingeckoId: 'tron',
    change24h: 1.45,
    networks: [
      { name: 'TRON (TRC20)', address: 'TBVhUqz5KarVFfK1k2UEALFxL6Pu8cfGHc' },
    ],
    listed: true,
  },
  {
    symbol: 'TON',
    name: 'Toncoin',
    color: '#0098EA',
    icon: '◆',
    iconUrl: '/tokens/ton.png',
    price: 5.42,
    coingeckoId: 'the-open-network',
    change24h: 4.12,
    networks: [
      { name: 'TON Network', address: 'UQC6BnUFgNB-8AxBQxo7_V7tblornEiUI6eSt8UOS4opKeiA' },
    ],
    listed: true,
  },
]

export function getToken(symbol: string): TokenConfig | undefined {
  return TOKENS.find((t) => t.symbol === symbol)
}

export const TOKEN_SYMBOLS = TOKENS.map((t) => t.symbol)

export function formatTokenAmount(amount: number, symbol: string): string {
  const decimals = symbol === 'BTC' ? 6 : symbol === 'ETH' ? 6 : symbol === 'SOL' ? 4 : symbol === 'TRX' ? 2 : 2
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
