// Ciclo do diário na API: aberto -> fechado (pendente de assinatura) -> assinado.
export type StatusDiario = 'aberto' | 'fechado' | 'assinado';

// Usado na lista (GET /diarios) e no diário aberto do motorista (GET /diarios/aberto/{login}).
export interface DiarioResponse {
  id: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  motoristaNome: string;
  medidorInicial: number;
  medidorFinal: number | null;
  medidorPercorrido: number | null;
  destino: string | null;
  status: StatusDiario;
  abertoEm: string | null;
  fechadoEm: string | null;
}

// GET /diarios/{id}/verificar (exige token). "integro: false" = conteúdo mudou depois da assinatura.
export interface VerificacaoDiario {
  assinado: boolean;
  integro: boolean;
  assinadoEm: string | null;
  mensagem: string;
}

export interface DiarioResumoMensal {
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  mes: number;
  ano: number;
  totalDiarios: number;
  primeiroMedidor: number;
  ultimoMedidor: number;
  totalPercorrido: number;
}
