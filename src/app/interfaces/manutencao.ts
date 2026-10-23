export type StatusManutencao = 'aberta' | 'em_andamento' | 'concluida';
export type TipoManutencao = 'preventiva' | 'corretiva';

export interface PecaResponse {
  id: string;
  nomePeca: string;
  codigoPeca: string | null;
  marcaPeca: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface PecaRequest {
  nomePeca: string;
  codigoPeca?: string | null;
  marcaPeca?: string | null;
  quantidade: number;
  valorUnitario: number;
}

export interface ManutencaoResponse {
  id: string;
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  ocorrenciaId: string | null;
  tipo: TipoManutencao;
  descricao: string;
  mecanicoResponsavel: string | null;
  oficina: string | null;
  custoMaoObra: number;
  custoPecas: number;
  custoTotal: number;
  status: StatusManutencao;
  abertaEm: string | null;
  concluidaEm: string | null;
  observacoes: string | null;
  fotoNotaFiscal: string | null;
  pecas: PecaResponse[];
}

export interface ManutencaoRequest {
  veiculoId: string;
  ocorrenciaId?: string | null;
  tipo: TipoManutencao;
  descricao: string;
  mecanicoResponsavel?: string | null;
  oficina?: string | null;
  custoMaoObra?: number;
  observacoes?: string | null;
  fotoNotaFiscal?: string | null;
  pecas?: PecaRequest[];
}

export interface AtualizarStatusRequest {
  status: StatusManutencao;
  observacoes?: string | null;
}
