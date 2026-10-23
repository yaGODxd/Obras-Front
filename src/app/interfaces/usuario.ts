export type Perfil = 'gestor' | 'motorista';

export interface UsuarioResponse {
  id: string;
  nomeCompleto: string;
  login: string;
  perfil: Perfil;
  fotoPerfil: string | null;
  ativo: boolean;
  matricula: string | null;
  vinculo: string | null;
  secretariaId: number | null;
  secretariaNome: string | null;
  categoriaCnh: string | null;
  validadeCnh: string | null;
  telefone: string | null;
}

export interface CriarUsuarioRequest {
  nomeCompleto: string;
  cpf: string;
  login: string;
  senha: string;
  perfil: Perfil;
  matricula?: string | null;
  vinculo?: string | null;
  secretariaId?: number | null;
  categoriaCnh?: string | null;
  validadeCnh?: string | null;
  telefone?: string | null;
}

export interface AtualizarUsuarioRequest {
  nomeCompleto?: string | null;
  fotoPerfil?: string | null;
  matricula?: string | null;
  vinculo?: string | null;
  secretariaId?: number | null;
  categoriaCnh?: string | null;
  validadeCnh?: string | null;
  telefone?: string | null;
}

export interface AtualizarPerfilRequest {
  nomeCompleto: string;
  fotoPerfil: string | null;
}

export interface MotoristaOnline {
  id: string;
  nomeCompleto: string;
  login: string;
  fotoPerfil: string | null;
  turnoAbertoEm: string | null;
}

export interface SecretariaResponse {
  id: number;
  nome: string;
}
