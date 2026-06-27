// Central token configuration for Habesha Exchange.
// Prices are static for demo stability; HABESHA price is FIXED per requirement.

export interface NetworkInfo {
  name: string
  address: string
}

// Bank withdrawal configuration (ETB cash-out to Ethiopian banks).
export const ETB_RATE = 192 // 1 USD = 192 ETB (per requirement)
export const BANKS = [
  { code: 'CBE', name: 'Commercial Bank of Ethiopia (CBE)', short: 'CBE' },
  { code: 'Telebirr', name: 'Telebirr', short: 'Telebirr' },
  { code: 'Abay Bank', name: 'Abay Bank', short: 'Abay Bank' },
  { code: 'EMPSA', name: 'EMPSA', short: 'EMPSA' },
] as const

export interface TokenConfig {
  symbol: string
  name: string
  color: string
  icon: string // emoji / glyph fallback
  iconUrl?: string // real token icon image
  price: number // USD price
  fixed?: boolean // fixed price (HABESHA)
  change24h: number // simulated % change
  networks: NetworkInfo[] // deposit networks + wallet addresses
  internalOnly?: boolean // Habesha: cannot deposit/withdraw externally
  listed: boolean // publicly listed
}

export const HABESHA_PRICE = 6.4321674
export const HABESHA_AIRDROP_USD = 15

export const TOKENS: TokenConfig[] = [
  {
    symbol: 'USDT',
    name: 'Tether USD',
    color: '#26A17B',
    icon: '₮',
    iconUrl: '/tokens/usdt.png',
    price: 1.0,
    change24h: 0.01,
    networks: [
      { name: 'TRON (TRC20)', address: 'TLksVFpUGS5SHeR4sJ1fDEajZ2fX59Nu5o' },
      { name: 'Ethereum (ERC20)', address: '0xb2ba1a5b4ada2f3109cd393e7d6610cf6731ac27' },
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
    change24h: -0.02,
    networks: [
      { name: 'Ethereum (ERC20)', address: '0xb2ba1a5b4ada2f3109cd393e7d6610cf6731ac27' },
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
    change24h: 2.34,
    networks: [
      { name: 'Bitcoin Network', address: '15dQRtHdefyx8VmkSRKXyinzWyLUTGp9SA' },
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
    change24h: 4.12,
    networks: [
      { name: 'TON Network', address: 'UQC6BnUFgNB-8AxBQxo7_V7tblornEiUI6eSt8UOS4opKeiA' },
    ],
    listed: true,
  },
  {
    symbol: 'HABESHA',
    name: 'Habesha Token',
    color: '#F0B90B',
    icon: 'H',
    iconUrl: '/tokens/habesha.jpg',
    price: HABESHA_PRICE,
    fixed: true,
    change24h: 0,
    networks: [], // no external deposit
    internalOnly: true,
    listed: false, // not listed publicly yet, but shown in exchange
  },
]

export function getToken(symbol: string): TokenConfig | undefined {
  return TOKENS.find((t) => t.symbol === symbol)
}

export const TOKEN_SYMBOLS = TOKENS.map((t) => t.symbol)

export function formatTokenAmount(amount: number, symbol: string): string {
  const decimals = symbol === 'BTC' ? 6 : symbol === 'HABESHA' ? 4 : 2
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
