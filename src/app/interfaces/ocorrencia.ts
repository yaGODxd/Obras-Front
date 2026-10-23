import { CamposHorarioSuspeito } from './horario-suspeito';
import { StatusManutencao } from './manutencao';

// pendente -> em_andamento (ao criar manutenção ligada) -> resolvida (todas as ligadas concluídas). O gestor também muda à mão.
export type StatusOcorrencia = 'pendente' | 'em_andamento' | 'resolvida';

// Manutenção ligada à ocorrência (só na lista detalhada).
export interface ManutencaoDaOcorrencia {
  id: string;
  status: StatusManutencao;
}

// status, resolvidaEm e manutencoes são opcionais: respostas antigas não trazem (status ausente = pendente).
export interface OcorrenciaDetalhada extends CamposHorarioSuspeito {
  id: string;
  diarioId: string;
  tipo: string;
  descricao: string;
  latitude: number | null;
  longitude: number | null;
  registradoEm: string | null;
  motoristaLogin: string;
  motoristaNome: string;
  motoristaFoto: string | null;
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  status?: StatusOcorrencia;
  resolvidaEm?: string | null;
  manutencoes?: ManutencaoDaOcorrencia[];
}

// GET /ocorrencias/diario/{diarioId}: só os campos usados no detalhe do diário.
export interface OcorrenciaDoDiario extends CamposHorarioSuspeito {
  id?: string;
  status?: StatusOcorrencia;
  resolvidaEm?: string | null;
  tipo: string;
  descricao: string;
  latitude: number | null;
  longitude: number | null;
  registradoEm: string | null;
}
