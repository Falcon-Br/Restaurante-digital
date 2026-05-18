const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrencyBRL(value: number | null | undefined) {
  const numericValue = Number(value)
  return brlFormatter.format(Number.isFinite(numericValue) ? numericValue : 0)
}

export function maskCurrencyBRL(value: string) {
  const digits = value.replace(/\D/g, '')
  const cents = Number(digits || '0')
  return formatCurrencyBRL(cents / 100)
}

export function parseCurrencyBRL(value: string) {
  const normalized = value
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  const numericValue = Number(normalized)
  return Number.isFinite(numericValue) ? numericValue : 0
}
