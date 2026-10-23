import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

describe('authInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => api.verify());

  it('envia o Bearer nas chamadas à API', () => {
    localStorage.setItem('token', 'tok123');
    http.get(`${API}/veiculos`).subscribe();

    const req = api.expectOne(`${API}/veiculos`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok123');
    req.flush([]);
  });

  it('envia o Bearer também no download de foto (blob), que o <img src> não mandaria', () => {
    localStorage.setItem('token', 'tok123');
    http.get(`${API}/fotos/f1`, { responseType: 'blob' }).subscribe();
    const req = api.expectOne(`${API}/fotos/f1`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok123');
    req.flush(new Blob(['x']));
  });

  it('não envia o Bearer no login', () => {
    localStorage.setItem('token', 'tok123');
    http.post(`${API}/auth/login`, {}).subscribe();

    const req = api.expectOne(`${API}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('não envia o token para outros domínios', () => {
    localStorage.setItem('token', 'tok123');
    http.get('https://outro-site.com/dados').subscribe();

    const req = api.expectOne('https://outro-site.com/dados');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('sem token, não envia header', () => {
    http.get(`${API}/veiculos`).subscribe();

    const req = api.expectOne(`${API}/veiculos`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('401 encerra a sessão, mantém o tema e vai para o login uma vez só', () => {
    localStorage.setItem('token', 'tok123');
    localStorage.setItem('tema', 'obras-green');
    http.get(`${API}/veiculos`).subscribe({ error: () => {} });
    http.get(`${API}/manutencoes`).subscribe({ error: () => {} });

    api.expectOne(`${API}/veiculos`).flush(null, { status: 401, statusText: 'Unauthorized' });
    api.expectOne(`${API}/manutencoes`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('tema')).toBe('obras-green');
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'sessao-expirada' } });
  });

  it('401 no login não navega (é senha errada) e repassa o erro', () => {
    let status = 0;
    http.post(`${API}/auth/login`, {}).subscribe({ error: e => (status = e.status) });

    api.expectOne(`${API}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('outros erros (500) não encerram a sessão', () => {
    localStorage.setItem('token', 'tok123');
    http.get(`${API}/veiculos`).subscribe({ error: () => {} });

    api.expectOne(`${API}/veiculos`).flush(null, { status: 500, statusText: 'Erro' });

    expect(localStorage.getItem('token')).toBe('tok123');
    expect(navegar).not.toHaveBeenCalled();
  });
});
