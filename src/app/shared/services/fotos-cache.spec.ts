import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FotosCache } from './fotos-cache';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('FotosCache', () => {
  let cache: FotosCache;
  let api: HttpTestingController;
  let criar: ReturnType<typeof vi.fn>;
  let liberar: ReturnType<typeof vi.fn>;
  let contador = 0;

  beforeEach(() => {
    // jsdom não tem URL.createObjectURL/revokeObjectURL.
    criar = vi.fn(() => `blob:foto-${++contador}`);
    liberar = vi.fn();
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: liberar });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FotosCache],
    });
    cache = TestBed.inject(FotosCache);
    api = TestBed.inject(HttpTestingController);
  });

  afterEach(() => api.verify());

  it('lista do diário: busca uma vez e depois usa a guardada', () => {
    let recebida: unknown;
    cache.fotosDoDiario('d1').subscribe();
    api.expectOne(`${API}/diarios/d1/fotos`).flush([]);
    cache.fotosDoDiario('d1').subscribe(l => (recebida = l));
    api.expectNone(`${API}/diarios/d1/fotos`);
    expect(recebida).toEqual([]);
  });

  it('imagem: baixa como blob uma vez só, mesmo com dois pedidos ao mesmo tempo', () => {
    const urls: string[] = [];
    cache.url('f1').subscribe(u => urls.push(u));
    cache.url('f1').subscribe(u => urls.push(u));
    const req = api.expectOne(`${API}/fotos/f1`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x'], { type: 'image/jpeg' }));

    cache.url('f1').subscribe(u => urls.push(u));
    api.expectNone(`${API}/fotos/f1`);
    expect(criar).toHaveBeenCalledTimes(1);
    expect(new Set(urls).size).toBe(1);
    expect(urls.length).toBe(3);
  });

  it('erro ao baixar: não guarda nada e a próxima tentativa busca de novo', () => {
    let falhou = false;
    cache.url('f1').subscribe({ error: () => (falhou = true) });
    api.expectOne(`${API}/fotos/f1`).flush(new Blob(), { status: 500, statusText: 'Erro' });
    expect(falhou).toBe(true);

    cache.url('f1').subscribe();
    api.expectOne(`${API}/fotos/f1`).flush(new Blob(['x']));
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('ao sair da tela libera todas as URLs criadas', () => {
    cache.url('f1').subscribe();
    cache.url('f2').subscribe();
    api.expectOne(`${API}/fotos/f1`).flush(new Blob(['1']));
    api.expectOne(`${API}/fotos/f2`).flush(new Blob(['2']));

    cache.ngOnDestroy();
    expect(liberar).toHaveBeenCalledTimes(2);
  });

  it('download cancelado quando ninguém mais espera a foto', () => {
    const inscricao = cache.url('f1').subscribe();
    const req = api.expectOne(`${API}/fotos/f1`);
    inscricao.unsubscribe();
    expect(req.cancelled).toBe(true);
  });

  it('lista do diário: vários pedidos ao mesmo tempo viram uma chamada só', () => {
    let respostas = 0;
    cache.fotosDoDiario('d1').subscribe(() => respostas++);
    cache.fotosDoDiario('d1').subscribe(() => respostas++);
    cache.fotosDoDiario('d1').subscribe(() => respostas++);
    api.expectOne(`${API}/diarios/d1/fotos`).flush([]);
    expect(respostas).toBe(3);
  });

  it('lista do diário com erro: a próxima tentativa busca de novo', () => {
    cache.fotosDoDiario('d1').subscribe({ error: () => {} });
    api.expectOne(`${API}/diarios/d1/fotos`).flush(null, { status: 503, statusText: 'Indisponível' });
    cache.fotosDoDiario('d1').subscribe();
    api.expectOne(`${API}/diarios/d1/fotos`).flush([]);
  });
});
