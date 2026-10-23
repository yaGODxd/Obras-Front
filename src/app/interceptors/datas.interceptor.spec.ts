import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { datasInterceptor } from './datas.interceptor';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

describe('datasInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([datasInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
  });

  afterEach(() => api.verify());

  it('corrige as datas das respostas JSON da API', () => {
    let resposta: unknown;
    http.get(`${API}/diarios`).subscribe(r => (resposta = r));

    api.expectOne(`${API}/diarios`).flush([{ abertoEm: '2026-10-18T13:08:00', destino: 'Centro' }]);

    expect(resposta).toEqual([{ abertoEm: '2026-10-18T13:08:00Z', destino: 'Centro' }]);
  });

  // APP_DATAS_COM_FUSO na API: desligada manda sem fuso, ligada manda com "Z". O front aceita os dois.
  it('aceita os dois formatos da API na mesma resposta e lê todos como o mesmo instante', () => {
    let resposta: Record<string, string> = {};
    http.get<Record<string, string>>(`${API}/diarios/1`).subscribe(r => (resposta = r));
    api.expectOne(`${API}/diarios/1`).flush({
      semFuso: '2026-10-20T14:00:00',
      comZ: '2026-10-20T14:00:00Z',
      comDeslocamento: '2026-10-20T11:00:00-03:00',
      soData: '2026-10-20',
    });
    expect(resposta['semFuso']).toBe('2026-10-20T14:00:00Z');
    expect(resposta['comZ']).toBe('2026-10-20T14:00:00Z');
    expect(resposta['comDeslocamento']).toBe('2026-10-20T11:00:00-03:00');
    expect(resposta['soData']).toBe('2026-10-20');
    const instantes = [resposta['semFuso'], resposta['comZ'], resposta['comDeslocamento']].map(d => new Date(d).getTime());
    expect(new Set(instantes).size).toBe(1);
  });

  it('não mexe em respostas de outros domínios', () => {
    let resposta: unknown;
    http.get('https://router.project-osrm.org/rota').subscribe(r => (resposta = r));

    api.expectOne('https://router.project-osrm.org/rota').flush({ hora: '2026-10-18T13:08:00' });

    expect(resposta).toEqual({ hora: '2026-10-18T13:08:00' });
  });

  it('não mexe em respostas que não são JSON', () => {
    let resposta = '';
    http.get(`${API}/arquivo`, { responseType: 'text' }).subscribe(r => (resposta = r));

    api.expectOne(`${API}/arquivo`).flush('2026-10-18T13:08:00');

    expect(resposta).toBe('2026-10-18T13:08:00');
  });
});
