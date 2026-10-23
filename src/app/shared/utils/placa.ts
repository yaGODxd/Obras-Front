// Placa do veículo. A API normaliza (maiúsculas, sem hífen e sem espaço) e devolve null quando não há placa.
// O front normaliza do mesmo jeito e NÃO valida o formato (máquinas não têm placa).
// PDF usa "S/P" e CSV deixa a célula vazia (colunas estreitas e filtro em planilha); "Sem placa" é só para a tela.
export const SEM_PLACA = 'Sem placa';

// Igual à API: "abc-1d 23" -> "ABC1D23"; vazio, só espaços ou só hífen -> null.
export function normalizarPlaca(placa: string | null | undefined): string | null {
  const normalizada = (placa ?? '').toUpperCase().replace(/[\s-]/g, '');
  return normalizada || null;
}

export function temPlaca(placa: string | null | undefined): boolean {
  return normalizarPlaca(placa) !== null;
}

export function rotuloPlaca(placa: string | null | undefined): string {
  return normalizarPlaca(placa) ?? SEM_PLACA;
}

// "Caminhão 1 — ABC1D23" ou só "Caminhão 1".
export function rotuloVeiculo(descricao: string, placa: string | null | undefined): string {
  const p = normalizarPlaca(placa);
  return p ? `${descricao} — ${p}` : descricao;
}
