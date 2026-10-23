import { CamposHorarioSuspeito } from './horario-suspeito';

export interface AbastecimentoDetalhado extends CamposHorarioSuspeito {
  id: string;
  tipoCombustivel: string;
  litros: number;
  valorTotal: number;
  posto: string | null;
  registradoEm: string | null;
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  motoristaLogin: string;
  motoristaNome: string;
  motoristaFoto: string | null;
  veiculoAbastecidoId: string | null;
  veiculoAbastecidoDescricao: string | null;
}

// GET /abastecimentos/diario/{diarioId}: só os campos usados no detalhe do diário.
export interface AbastecimentoDoDiario extends CamposHorarioSuspeito {
  // Opcional: sem ele não dá para achar as fotos do abastecimento (vínculo por abastecimentoId).
  id?: string;
  tipoCombustivel: string;
  litros: number;
  valorTotal: number;
  posto: string | null;
  registradoEm: string | null;
}
