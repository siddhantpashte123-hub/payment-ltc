declare module 'bitcore-lib-litecoin' {
  export class PrivateKey {
    constructor(wif?: string)
    toAddress(): { toString(): string }
    toWIF(): string
  }
  export class Transaction {
    from(utxos: Array<{
      txId: string
      outputNo: number
      script: Buffer
      satoshis: number
      address: string
    }>): this
    to(address: string, satoshis: number): this
    change(address: string): this
    fee(fee: number): this
    sign(privateKey: PrivateKey): this
    serialize(): string
  }
}
