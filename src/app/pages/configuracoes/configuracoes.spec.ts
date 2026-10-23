import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ConfiguracoesComponent } from './configuracoes';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth';

function eventoArquivo(arquivo: File): Event {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', { value: [arquivo] });
  return { target: input } as unknown as Event;
}

describe('Configuracoes', () => {
  let component: ConfiguracoesComponent;
  let fixture: ComponentFixture<ConfiguracoesComponent>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('login', 'gestor1');
    await TestBed.configureTestingModule({
      imports: [ConfiguracoesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracoesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('nome e perfil vindos da API aparecem na tela (signals)', async () => {
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/usuarios/gestor1`).flush({
      nomeCompleto: 'Maria Gestora', perfil: 'gestor', fotoPerfil: null,
    });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Maria Gestora');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Gestor');
  });

  it('salvar o perfil atualiza o nome guardado na sessão (pelo AuthService)', () => {
    const api = TestBed.inject(HttpTestingController);
    api.expectOne(`${environment.apiUrl}/usuarios/gestor1`).flush({ nomeCompleto: 'Maria', perfil: 'gestor', fotoPerfil: null });

    component.nomeCompleto.set('Maria Souza');
    component.salvarPerfil();
    const req = api.expectOne(`${environment.apiUrl}/usuarios/gestor1/perfil`);
    expect(req.request.body).toEqual({ nomeCompleto: 'Maria Souza', fotoPerfil: null });
    req.flush(null);

    expect(TestBed.inject(AuthService).getNome()).toBe('Maria Souza');
  });

  it('a foto de perfil vai como o original, sem redução', async () => {
    const bytes = new Uint8Array([1, 2, 3, 250]);
    component.onFotoSelecionada(eventoArquivo(new File([bytes], 'eu.png', { type: 'image/png' })));

    await vi.waitFor(() => expect(component.fotoPerfil()).toBe(btoa(String.fromCharCode(1, 2, 3, 250))));
    expect(component.fotoPreview()?.startsWith('data:image/png;base64,')).toBe(true);
  });

  describe('uso das fotos (Informações do Sistema)', () => {
    const URL_USO = `${environment.apiUrl}/fotos/uso`;
    const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

    it('mostra quantidade, MB das fotos e do banco', async () => {
      TestBed.inject(HttpTestingController).expectOne(URL_USO)
        .flush({ quantidadeFotos: 12, megabytesFotos: 3.4, megabytesTabelaFotos: 3.6, megabytesBanco: 120.25 });
      await fixture.whenStable();
      expect(texto()).toContain('12 foto(s) · 3,4 MB');
      expect(texto()).toContain('Banco inteiro: 120,3 MB (tabela de fotos: 3,6 MB)');
    });

    it('erro: mostra a mensagem e "Tentar de novo" busca outra vez', async () => {
      const api = TestBed.inject(HttpTestingController);
      api.expectOne(URL_USO).flush({ erro: 'Sem permissão.' }, { status: 403, statusText: 'Forbidden' });
      await fixture.whenStable();
      expect(texto()).toContain('Sem permissão.');

      const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
        .find(b => b.textContent?.includes('Tentar de novo'))!;
      botao.click();
      api.expectOne(URL_USO).flush({ quantidadeFotos: 0, megabytesFotos: 0, megabytesTabelaFotos: 0, megabytesBanco: 50 });
      await fixture.whenStable();
      expect(texto()).toContain('0 foto(s)');
    });
  });
});
