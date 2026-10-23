export interface LogResponse {
  id: string;
  usuarioLogin: string;
  usuarioNome: string | null;
  usuarioFoto: string | null;
  acao: string;
  descricao: string;
  ip: string | null;
  criadoEm: string | null;
}
