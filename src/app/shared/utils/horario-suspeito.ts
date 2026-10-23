import { CamposHorarioSuspeito } from '../../interfaces/horario-suspeito';

// A API manda só códigos, separados por vírgula ("HORARIO_FUTURO,DESVIO_RELOGIO"). Os textos são do front.
// Código desconhecido aparece como veio.
const MOTIVOS: Record<string, string> = {
  HORARIO_FUTURO: 'Horário do celular está no futuro.',
  HORARIO_ANTIGO: 'Enviado mais de 7 dias depois do horário registrado.',
  DESVIO_RELOGIO: 'Relógio do celular estava mais de 5 min diferente do servidor.',
  FORA_DA_JANELA_DIARIO: 'Horário fora do período do diário.',
  FORA_DA_JANELA_TURNO: 'Horário fora do turno de trabalho.',
  COMBOIO_SEM_DIARIO: 'Comboio registrado por motorista que não dirigia um comboio nesse horário.',
};

// Texto geral, quando a API marca como suspeito sem dizer o motivo.
export const AVISO_HORARIO_SUSPEITO = 'Horário do celular fora do esperado.';

// Resposta antiga (sem o campo) conta como horário normal.
export function ehHorarioSuspeito(r: CamposHorarioSuspeito): boolean {
  return r.horarioSuspeito === true;
}

// Um texto por motivo, na ordem em que vieram. Vazio se o registro não é suspeito.
export function motivosSuspeita(r: CamposHorarioSuspeito): string[] {
  if (!ehHorarioSuspeito(r)) return [];
  const codigos = (r.motivoSuspeita ?? '').split(',').map(c => c.trim()).filter(c => c);
  return codigos.length ? codigos.map(c => MOTIVOS[c] ?? c) : [AVISO_HORARIO_SUSPEITO];
}

// Tudo numa linha (para o title do selo).
export function explicacaoSuspeita(r: CamposHorarioSuspeito): string {
  return motivosSuspeita(r).join(' ');
}
