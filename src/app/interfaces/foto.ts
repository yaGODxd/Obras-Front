export type TipoFoto = 'medidor_abertura' | 'medidor_fechamento' | 'ocorrencia' | 'livre' | 'cupom_fiscal' | 'bomba_comboio';

// GET /diarios/{id}/fotos: só os dados da foto, NUNCA a imagem (que vem de GET /fotos/{id}, com token).
export interface FotoDiario {
  id: string;
  diarioId: string;
  tipo: TipoFoto;
  ocorrenciaId: string | null;
  abastecimentoId: string | null;
  tiradaEm: string | null;
  recebidaEm: string | null;
  tamanhoBytes: number;
  tipoMime: string;
  hashSha256: string;
  idLocal: string | null;
  horarioSuspeito?: boolean;
  motivoSuspeita?: string | null;
}

// GET /fotos/uso (só gestor).
export interface UsoFotos {
  quantidadeFotos: number;
  megabytesFotos: number;
  megabytesTabelaFotos: number;
  megabytesBanco: number;
}
