// Status que a API grava para o veículo. "inativo" vem do DELETE /veiculos/{id} (não apaga, só inativa).
export type StatusVeiculo = 'disponivel' | 'em_uso' | 'em_manutencao' | 'inativo';

export interface VeiculoResponse {
  id: string;
  tipoNome: string;
  tipoMedidor: string;
  placa: string | null;
  descricao: string;
  status: StatusVeiculo;
  medidorAtual: number;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
  renavam: string | null;
  chassi: string | null;
  comboio: boolean;
}

export interface VeiculoRequest {
  tipoId: string;
  placa?: string | null;
  descricao: string;
  medidorAtual?: number;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  cor?: string | null;
  renavam?: string | null;
  chassi?: string | null;
  comboio?: boolean;
}

export interface TipoVeiculo {
  id: string;
  nome: string;
  medidor: string;
}

export interface VeiculoEmUso {
  id: string;
  tipoNome: string;
  placa: string | null;
  descricao: string;
  medidorAtual: number;
  motoristaId: string;
  motoristaNome: string;
  motoristaLogin: string;
  diarioAbertoEm: string | null;
}

export interface MotoristaVeiculoInfo {
  id: string;
  nomeCompleto: string;
  login: string;
  fotoPerfil: string | null;
  totalUsos?: number;
  ultimoUso?: string | null;
}

// GET /veiculos/{id}/motoristas
export interface MotoristasDoVeiculo {
  maisUsou: MotoristaVeiculoInfo | null;
  ultimo: MotoristaVeiculoInfo | null;
}
