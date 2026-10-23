import { HttpErrorResponse } from '@angular/common/http';
import { codigoDeErro, mensagemDeErro } from './erros';

function erroHttp(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('mensagemDeErro', () => {
  it('1º usa o {"erro"} da API', () => {
    expect(mensagemDeErro(erroHttp(403, { erro: 'PIN incorreto.' }))).toBe('PIN incorreto.');
    expect(mensagemDeErro(erroHttp(423, { erro: 'PIN bloqueado.', message: 'outra' }))).toBe('PIN bloqueado.');
  });

  it('2º usa o "message", se existir', () => {
    expect(mensagemDeErro(erroHttp(400, { message: 'Placa já cadastrada.' }))).toBe('Placa já cadastrada.');
  });

  it('nunca mostra o "error" do Spring (nome do status em inglês)', () => {
    const spring = { timestamp: '2026-10-18T13:00:00Z', status: 404, error: 'Not Found', path: '/veiculos/x' };
    expect(mensagemDeErro(erroHttp(404, spring))).toBe('Registro não encontrado.');
    expect(mensagemDeErro(erroHttp(500, { ...spring, status: 500, error: 'Internal Server Error' })))
      .toBe('Erro no servidor. Tente novamente; se continuar, avise o administrador.');
  });

  it('corpo vazio usa a mensagem padrão do status', () => {
    expect(mensagemDeErro(erroHttp(400))).toContain('Não foi possível salvar');
    expect(mensagemDeErro(erroHttp(400, { erro: '   ' }))).toContain('Não foi possível salvar');
    expect(mensagemDeErro(erroHttp(403))).toBe('Você não tem permissão para esta ação.');
  });

  it('nunca exibe HTML ou texto cru da resposta', () => {
    const html = '<html><body><h1>503 Service Unavailable</h1></body></html>';
    expect(mensagemDeErro(erroHttp(503, html))).toBe('O servidor está iniciando. Aguarde cerca de 1 minuto e tente de novo.');
    expect(mensagemDeErro(erroHttp(500, 'stack trace...'))).not.toContain('stack');
  });

  it('status 0, 502 e 504', () => {
    expect(mensagemDeErro(erroHttp(0))).toContain('Sem conexão com o servidor');
    expect(mensagemDeErro(erroHttp(502))).toContain('O servidor está iniciando');
    expect(mensagemDeErro(erroHttp(504))).toContain('O servidor está iniciando');
  });

  it('erro que não é HTTP', () => {
    expect(mensagemDeErro(new Error('x'))).toBe('Ocorreu um erro inesperado. Tente de novo.');
  });
});

describe('codigoDeErro', () => {
  it('lê o "codigo" do corpo do erro', () => {
    expect(codigoDeErro(erroHttp(409, { erro: 'Placa já usada.', codigo: 'PLACA_EM_USO' }))).toBe('PLACA_EM_USO');
  });

  it('sem código, corpo vazio ou erro que não é HTTP: null', () => {
    expect(codigoDeErro(erroHttp(409, { erro: 'Não é possível alterar peça de manutenção concluída.' }))).toBeNull();
    expect(codigoDeErro(erroHttp(400))).toBeNull();
    expect(codigoDeErro(new Error('x'))).toBeNull();
  });
});
