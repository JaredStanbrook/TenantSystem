export function currencyConvertor(input: string): number {
  const num = parseFloat(input);
  return Math.round(num * 100);
}
