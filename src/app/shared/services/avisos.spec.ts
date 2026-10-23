import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AvisosService } from './avisos';

describe('AvisosService', () => {
  let avisos: AvisosService;

  beforeEach(() => {
    vi.useFakeTimers();
    avisos = TestBed.inject(AvisosService);
  });

  afterEach(() => vi.useRealTimers());

  it('mostra sucesso e some sozinho depois de 4 s', () => {
    avisos.sucesso('Salvo.');
    expect(avisos.avisos()).toEqual([expect.objectContaining({ tipo: 'sucesso', texto: 'Salvo.' })]);

    vi.advanceTimersByTime(4000);
    expect(avisos.avisos()).toEqual([]);
  });

  it('erro fica mais tempo na tela (8 s)', () => {
    avisos.erro('Falhou.');
    vi.advanceTimersByTime(4000);
    expect(avisos.avisos().length).toBe(1);

    vi.advanceTimersByTime(4000);
    expect(avisos.avisos().length).toBe(0);
  });

  it('erroHttp usa a regra de mensagens da API', () => {
    avisos.erroHttp(new HttpErrorResponse({ status: 400, error: null }));
    expect(avisos.avisos()[0].texto).toContain('Não foi possível salvar');
  });

  it('fechar remove só o aviso escolhido', () => {
    avisos.sucesso('A');
    avisos.sucesso('B');
    avisos.fechar(avisos.avisos()[0].id);

    expect(avisos.avisos().map(a => a.texto)).toEqual(['B']);
  });
});
