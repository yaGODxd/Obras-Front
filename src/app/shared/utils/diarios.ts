// Ciclo do diário na API: aberto -> fechado (pendente de assinatura) -> assinado.
// O front nunca edita diário: só lê e verifica.

const ROTULOS: Record<string, string> = {
  aberto: 'Aberto',
  fechado: 'Pendente de assinatura',
  assinado: 'Assinado',
};

// Rótulo curto para tabelas (o completo vai no title do badge).
const ROTULOS_CURTOS: Record<string, string> = {
  aberto: 'Aberto',
  fechado: 'Pendente',
  assinado: 'Assinado',
};

const BADGES: Record<string, string> = {
  aberto: 'badge-warning',
  fechado: 'badge-info',
  assinado: 'badge-success',
};

// Status desconhecido aparece como veio da API.
export function rotuloStatusDiario(status: string): string {
  return ROTULOS[status] ?? status;
}

export function rotuloCurtoStatusDiario(status: string): string {
  return ROTULOS_CURTOS[status] ?? status;
}

export function badgeStatusDiario(status: string): string {
  return BADGES[status] ?? 'badge-ghost';
}

// Relatórios de diários: só entram diários com dados completos (fechados e assinados).
// Abertos (em andamento) e status desconhecidos ficam de fora.
export function diariosParaRelatorio<T extends { status: string }>(
  diarios: T[],
  somenteAssinados: boolean
): { diarios: T[]; pendentes: number } {
  const completos = diarios.filter(d => d.status === 'fechado' || d.status === 'assinado');
  const pendentes = completos.filter(d => d.status === 'fechado').length;
  return {
    diarios: somenteAssinados ? completos.filter(d => d.status === 'assinado') : completos,
    pendentes,
  };
}

export function avisoPendentes(pendentes: number, somenteAssinados: boolean): string {
  if (pendentes === 0) return '';
  const texto = `${pendentes} diário(s) pendente(s) de assinatura no período`;
  return somenteAssinados ? `${texto} (não incluídos neste relatório).` : `${texto}.`;
}
