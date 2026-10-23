// Cor do badge pelo tipo de combustível (texto livre vindo da API).
export function badgeCombustivel(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes('diesel')) return 'badge-warning';
  if (t.includes('gasolina')) return 'badge-error';
  if (t.includes('etanol')) return 'badge-success';
  if (t.includes('gnv')) return 'badge-info';
  return 'badge-neutral';
}

// Total de litros e de R$ de uma lista de abastecimentos (ex.: os de um diário).
export function somarAbastecimentos(lista: readonly { litros: number; valorTotal: number }[]): { litros: number; valor: number } {
  return lista.reduce((t, a) => ({ litros: t.litros + a.litros, valor: t.valor + a.valorTotal }), { litros: 0, valor: 0 });
}
