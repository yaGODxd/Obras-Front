import { StatusOcorrencia } from '../../interfaces/ocorrencia';

const ROTULOS_STATUS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida',
};

const BADGES_STATUS: Record<string, string> = {
  pendente: 'badge-warning',
  em_andamento: 'badge-info',
  resolvida: 'badge-success',
};

// Resposta antiga (sem status) conta como pendente.
export function statusDaOcorrencia(o: { status?: StatusOcorrencia | null }): StatusOcorrencia {
  return o.status ?? 'pendente';
}

// Status desconhecido aparece como veio, em cinza.
export function rotuloStatusOcorrencia(status: string): string {
  return ROTULOS_STATUS[status] ?? status;
}

export function badgeStatusOcorrencia(status: string): string {
  return BADGES_STATUS[status] ?? 'badge-ghost';
}

// Cor do badge pelo tipo de ocorrência (texto livre vindo da API).
export function badgeTipoOcorrencia(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes('acidente')) return 'badge-error';
  if (t.includes('pane')) return 'badge-warning';
  if (t.includes('pneu')) return 'badge-info';
  if (t.includes('combustível') || t.includes('combustivel')) return 'badge-warning';
  return 'badge-neutral';
}
