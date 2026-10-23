import { HttpErrorResponse } from '@angular/common/http';

// Formatos de erro da API (ver docs/CLAUDE.md):
// 1. {"erro": "mensagem em português"} (rotas de assinatura): pode mostrar.
// 2. Erro padrão do Spring {"timestamp","status","error","path"}: o "error" é o nome do status
//    em inglês ("Not Found") e NUNCA é mostrado.
// 3. Corpo vazio (400 antigos, 401) ou HTML (502/503/504 com o servidor acordando): usa o texto padrão.
// Ordem: body.erro -> body.message -> mensagem padrão por status.
// Exibir sempre por interpolação do Angular ({{ }}), nunca com innerHTML.
export function mensagemDeErro(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return 'Ocorreu um erro inesperado. Tente de novo.';
  }
  const corpo: unknown = erro.error;
  if (typeof corpo === 'object' && corpo !== null) {
    if ('erro' in corpo && typeof corpo.erro === 'string' && corpo.erro.trim()) return corpo.erro;
    if ('message' in corpo && typeof corpo.message === 'string' && corpo.message.trim()) return corpo.message;
  }
  return mensagemPorStatus(erro.status);
}

// O "codigo" de {"erro", "codigo"} (só vem em alguns erros). Serve para o front decidir o que fazer; nunca mostrar cru.
export function codigoDeErro(erro: unknown): string | null {
  if (!(erro instanceof HttpErrorResponse)) return null;
  const corpo: unknown = erro.error;
  if (typeof corpo === 'object' && corpo !== null && 'codigo' in corpo && typeof corpo.codigo === 'string') {
    return corpo.codigo;
  }
  return null;
}

export function mensagemPorStatus(status: number): string {
  if (status === 0) return 'Sem conexão com o servidor. Verifique a internet ou tente de novo em instantes.';
  if (status === 400) return 'Não foi possível salvar. Confira os campos e se já não existe um cadastro igual (login, CPF, placa).';
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  if (status === 404) return 'Registro não encontrado.';
  if (status === 502 || status === 503 || status === 504) return 'O servidor está iniciando. Aguarde cerca de 1 minuto e tente de novo.';
  if (status >= 500) return 'Erro no servidor. Tente novamente; se continuar, avise o administrador.';
  return 'Não foi possível concluir a ação. Tente de novo.';
}
