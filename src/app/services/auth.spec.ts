import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth';

// Monta um JWT de mentira (só o payload importa para o front).
function criarToken(payload: object): string {
  return `cabecalho.${btoa(JSON.stringify(payload))}.assinatura`;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('tokenValido', () => {
    it('aceita token com exp no futuro (em milissegundos)', () => {
      localStorage.setItem('token', criarToken({ sub: 'gestor1', exp: Date.now() + 60_000 }));
      expect(service.tokenValido()).toBe(true);
    });

    it('recusa token vencido', () => {
      localStorage.setItem('token', criarToken({ exp: Date.now() - 1 }));
      expect(service.tokenValido()).toBe(false);
    });

    it('trata exp em segundos como vencido (a API usa milissegundos)', () => {
      localStorage.setItem('token', criarToken({ exp: Math.floor(Date.now() / 1000) + 3600 }));
      expect(service.tokenValido()).toBe(false);
    });

    it('recusa token sem exp, malformado ou ausente', () => {
      localStorage.setItem('token', criarToken({ sub: 'x' }));
      expect(service.tokenValido()).toBe(false);

      localStorage.setItem('token', 'abc');
      expect(service.tokenValido()).toBe(false);

      localStorage.setItem('token', 'a.@@@.c');
      expect(service.tokenValido()).toBe(false);

      localStorage.removeItem('token');
      expect(service.tokenValido()).toBe(false);
    });
  });

  it('logout apaga só a sessão e mantém o tema', () => {
    ['token', 'nome', 'perfil', 'login'].forEach(c => localStorage.setItem(c, 'valor'));
    localStorage.setItem('tema', 'obras-dark');

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('nome')).toBeNull();
    expect(localStorage.getItem('perfil')).toBeNull();
    expect(localStorage.getItem('login')).toBeNull();
    expect(localStorage.getItem('tema')).toBe('obras-dark');
  });
});
