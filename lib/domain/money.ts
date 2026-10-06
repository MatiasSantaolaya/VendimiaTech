export function formatArs(cents: number) {
  const amount = cents / 100;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
}

export function pesosToCents(value: string) {
  const n = Number(String(value).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
