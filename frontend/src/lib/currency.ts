// Currency formatting helpers for Malawian Kwacha display.
const kwachaFormatter = new Intl.NumberFormat('en-MW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatKwacha(value: number | string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'MK 0';
  }
  return `MK ${kwachaFormatter.format(amount)}`;
}
