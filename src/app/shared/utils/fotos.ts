import { FotoDiario } from '../../interfaces/foto';
import { CamposHorarioSuspeito } from '../../interfaces/horario-suspeito';

// Rótulos das fotos do diário. Tipo desconhecido aparece como veio.
const ROTULOS_TIPO: Record<string, string> = {
  medidor_abertura: 'Medidor na abertura',
  medidor_fechamento: 'Medidor no fechamento',
  ocorrencia: 'Ocorrência',
  livre: 'Foto livre',
  cupom_fiscal: 'Cupom fiscal',
  bomba_comboio: 'Bomba do comboio',
};

export function rotuloTipoFoto(tipo: string): string {
  return ROTULOS_TIPO[tipo] ?? tipo;
}

// "850 KB" ou "1,2 MB".
export function formatarTamanhoFoto(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

// A foto chama de "recebidaEm" o que abastecimento e ocorrência chamam de "recebidoEm".
// Cópia com os dois nomes, para o <app-selo-horario-suspeito> mostrar "Recebido pelo servidor em".
export function comRecebidoEm(f: FotoDiario): FotoDiario & CamposHorarioSuspeito {
  return { ...f, recebidoEm: f.recebidaEm };
}
