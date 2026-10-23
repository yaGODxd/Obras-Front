import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth-guard';

function criarToken(exp: number): string {
  return `cabecalho.${btoa(JSON.stringify({ sub: 'u', exp }))}.assinatura`;
}

function executarGuard(): boolean | UrlTree {
  const resultado = TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
  );
  if (typeof resultado === 'boolean' || resultado instanceof UrlTree) return resultado;
  throw new Error('O guard deveria responder na hora (sem Observable/Promise)');
}

describe('authGuard', () => {
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    router = TestBed.inject(Router);
  });

  it('sem token, manda para o login', () => {
    const resultado = executarGuard();
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
  });

  it('token vencido: encerra a sessão e avisa "sessão expirada"', () => {
    localStorage.setItem('token', criarToken(Date.now() - 1000));
    localStorage.setItem('perfil', 'gestor');

    const resultado = executarGuard();

    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login?motivo=sessao-expirada');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('perfil motorista: bloqueia e encerra a sessão', () => {
    localStorage.setItem('token', criarToken(Date.now() + 60_000));
    localStorage.setItem('perfil', 'motorista');

    const resultado = executarGuard();

    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('gestor com token válido: libera', () => {
    localStorage.setItem('token', criarToken(Date.now() + 60_000));
    localStorage.setItem('perfil', 'gestor');

    expect(executarGuard()).toBe(true);
  });
});
