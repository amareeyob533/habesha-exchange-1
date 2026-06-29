// Buy USDT configuration — bank accounts + ETB rate.

export const BUY_ETB_RATE = 186 // 1 USDT = ~186 ETB (base rate, actual fluctuates)

export interface BuyBank {
  code: string
  name: string
  accountName: string // account holder name
  accountNumber: string // account number (copyable)
}

// Bank accounts where users send ETB to buy USDT.
export const BUY_BANKS: BuyBank[] = [
  {
    code: 'CBE',
    name: 'Commercial Bank of Ethiopia (CBE)',
    accountName: 'Melesech Aschale',
    accountNumber: '1000031904904',
  },
  {
    code: 'Telebirr',
    name: 'Telebirr',
    accountName: 'Amare Yalew',
    accountNumber: '0906045336',
  },
  {
    code: 'Abay Bank',
    name: 'Abay Bank',
    accountName: 'Melesech Aschale',
    accountNumber: '4209117438414016',
  },
  {
    code: 'M-PESA',
    name: 'M-PESA',
    accountName: 'To be added',
    accountNumber: 'To be added',
  },
]

export function getBuyBank(code: string): BuyBank | undefined {
  return BUY_BANKS.find((b) => b.code === code)
}
