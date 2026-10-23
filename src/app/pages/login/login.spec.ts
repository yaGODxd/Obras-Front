import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { LoginComponent } from './login';
import { environment } from '../../../environments/environment';

const URL_LOGIN = `${environment.apiUrl}/auth/login`;

describe('Login', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let api: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  function tentarEntrar(): void {
    component.login = 'gestor1';
    component.senha = 'senha';
    component.entrar();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('401: login ou senha incorretos', () => {
    tentarEntrar();
    api.expectOne(URL_LOGIN).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(component.erro()).toContain('Login ou senha incorretos');
    expect(component.carregando()).toBe(false);
  });

  it('status 0: servidor fora ou sem internet', () => {
    tentarEntrar();
    api.expectOne(URL_LOGIN).error(new ProgressEvent('error'));

    expect(component.erro()).toContain('Sem conexão com o servidor');
  });

  it('503 com HTML (servidor acordando): mensagem própria, sem mostrar o HTML', () => {
    tentarEntrar();
    api.expectOne(URL_LOGIN).flush('<html><h1>503</h1></html>', { status: 503, statusText: 'Indisponível' });

    expect(component.erro()).toBe('O servidor está iniciando. Aguarde cerca de 1 minuto e tente de novo.');
  });

  it('500: erro no servidor', () => {
    tentarEntrar();
    api.expectOne(URL_LOGIN).flush(null, { status: 500, statusText: 'Erro' });

    expect(component.erro()).toContain('Erro no servidor');
  });

  it('avisa que o servidor pode estar acordando quando demora', () => {
    vi.useFakeTimers();
    tentarEntrar();
    expect(component.demorando()).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(component.demorando()).toBe(true);

    api.expectOne(URL_LOGIN).flush({ token: 't', nome: 'Motorista', perfil: 'motorista' });
    expect(component.demorando()).toBe(false);
  });
});

describe('Login com sessão expirada', () => {
  it('mostra o aviso quando vem de uma sessão expirada', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ motivo: 'sessao-expirada' }) } },
        },
      ],
    }).compileComponents();

    const component = TestBed.createComponent(LoginComponent).componentInstance;
    expect(component.aviso()).toBe('Sua sessão expirou. Entre novamente.');
  });
});
