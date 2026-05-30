export type Tokenizer = {
  readonly name: string
  countTokens(text: string): Promise<number>
}
