// Registros feitos offline chegam com a hora do celular; a API marca os suspeitos (só aviso, nada é bloqueado).
// Vêm nas respostas de abastecimento e ocorrência. Opcionais: respostas antigas não trazem (padrão = não suspeito).
export interface CamposHorarioSuspeito {
  horarioSuspeito?: boolean;
  // Códigos separados por vírgula (ex.: "HORARIO_FUTURO,DESVIO_RELOGIO"). Textos em shared/utils/horario-suspeito.ts.
  motivoSuspeita?: string | null;
  recebidoEm?: string | null;
  idLocal?: string | null;
}
