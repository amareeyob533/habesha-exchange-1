// Buy USDT configuration — bank accounts + ETB rate.
// The admin can edit these account numbers later.

export const BUY_ETB_RATE = 192 // 1 USDT = 192 ETB

export interface BuyBank {
  code: string
  name: string
  accountName: string // account holder name
  accountNumber: string // account number (copyable)
}

// Bank accounts where users send ETB to buy USDT.
// TODO(admin): replace these placeholder account numbers with your real ones.
export const BUY_BANKS: BuyBank[] = [
  {
    code: 'CBE',
    name: 'Commercial Bank of Ethiopia (CBE)',
    accountName: 'Habesha Exchange',
    accountNumber: '1000200030004',
  },
  {
    code: 'Telebirr',
    name: 'Telebirr',
    accountName: 'Habesha Exchange',
    accountNumber: '0912345678',
  },
  {
    code: 'Abay Bank',
    name: 'Abay Bank',
    accountName: 'Habesha Exchange',
    accountNumber: '5600010001234',
  },
  {
    code: 'EMPSA',
    name: 'EMPSA',
    accountName: 'Habesha Exchange',
    accountNumber: 'EMPSA001234',
  },
]

export function getBuyBank(code: string): BuyBank | undefined {
  return BUY_BANKS.find((b) => b.code === code)
}
