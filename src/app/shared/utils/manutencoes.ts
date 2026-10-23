// Rótulos e cores de status e tipo de manutenção (os tipos ficam em interfaces/manutencao.ts).

const ROTULOS_STATUS: Record<string, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

const BADGES_STATUS: Record<string, string> = {
  aberta: 'badge-error',
  em_andamento: 'badge-warning',
  concluida: 'badge-success',
};

// Status desconhecido aparece como veio, em cinza.
export function rotuloStatusManutencao(status: string): string {
  return ROTULOS_STATUS[status] ?? status;
}

export function badgeStatusManutencao(status: string): string {
  return BADGES_STATUS[status] ?? 'badge-ghost';
}

export function rotuloTipoManutencao(tipo: string): string {
  return tipo === 'preventiva' ? 'Preventiva' : 'Corretiva';
}

export function badgeTipoManutencao(tipo: string): string {
  return tipo === 'preventiva' ? 'badge-info' : 'badge-warning';
}
