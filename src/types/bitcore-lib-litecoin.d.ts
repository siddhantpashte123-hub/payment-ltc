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
    /** Size-based fee estimate in litoshi (accounts for change output). */
    _estimateFee(): number
    /** Fee rate used by _estimateFee (litoshi per kb). */
    _feePerKb: number
    /** Built outputs (tx.to adds an entry; change() adds one). */
    outputs: Array<{ satoshis: number }>
  }
}
