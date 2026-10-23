// Cadastros de apoio: mecânicos e postos.

export interface MecanicoResponse {
  id: string;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
  ativo: boolean;
}

export interface MecanicoRequest {
  nome: string;
  telefone?: string | null;
  especialidade?: string | null;
}

export interface PostoResponse {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  ativo: boolean;
}

export interface PostoRequest {
  nome: string;
  endereco?: string | null;
  cidade?: string | null;
}
