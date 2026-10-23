import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Dashboard } from './dashboard';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;
const RAPIDOS = ['/usuarios/motoristas/online', '/veiculos/em-uso', '/veiculos', '/manutencoes/abertas', '/rastreamento/posicoes'];

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Dashboard: atualização automática', () => {
  let fixture: ComponentFixture<Dashboard>;
  let api: HttpTestingController;
  let visibilidade: DocumentVisibilityState;

  // Quantas vezes cada endereço foi chamado desde a última contagem (match "consome" os pedidos).
  const contar = (caminho: string) => api.match(r => r.url === API + caminho).length;
  const contarRapidos = () => RAPIDOS.map(contar);

  function mudarVisibilidade(estado: DocumentVisibilityState): void {
    visibilidade = estado;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    visibilidade = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilidade });

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    api = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // ngOnInit
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('ao abrir: busca os dados ao vivo e os abastecimentos; não busca a lista de diários', () => {
    expect(contarRapidos()).toEqual([1, 1, 1, 1, 1]);
    expect(contar('/abastecimentos')).toBe(1);
    expect(contar('/diarios')).toBe(0);
  });

  it('a cada 15 s atualiza só os dados ao vivo; abastecimentos só a cada 2 min', () => {
    contarRapidos(); contar('/abastecimentos');

    vi.advanceTimersByTime(15_000);
    expect(contarRapidos()).toEqual([1, 1, 1, 1, 1]);
    expect(contar('/abastecimentos')).toBe(0);

    vi.advanceTimersByTime(105_000); // total: 2 min
    expect(contar('/abastecimentos')).toBe(1);
    expect(contar('/diarios')).toBe(0);
  });

  it('aba oculta: para de buscar; ao voltar, atualiza na hora', () => {
    contarRapidos(); contar('/abastecimentos');

    mudarVisibilidade('hidden');
    vi.advanceTimersByTime(60_000);
    expect(contarRapidos()).toEqual([0, 0, 0, 0, 0]);

    mudarVisibilidade('visible');
    expect(contarRapidos()).toEqual([1, 1, 1, 1, 1]);   // na hora, sem esperar 15 s
    expect(contar('/abastecimentos')).toBe(0);           // só passou 1 min desde a última busca

    vi.advanceTimersByTime(15_000);
    expect(contarRapidos()).toEqual([1, 1, 1, 1, 1]);   // voltou ao ritmo normal
  });

  it('ao voltar depois de mais de 2 min oculta, também atualiza os abastecimentos', () => {
    contar('/abastecimentos');
    mudarVisibilidade('hidden');
    vi.advanceTimersByTime(3 * 60_000);

    mudarVisibilidade('visible');
    expect(contar('/abastecimentos')).toBe(1);
  });

  it('ao sair da tela, para de buscar', () => {
    contarRapidos(); contar('/abastecimentos');
    fixture.destroy();

    vi.advanceTimersByTime(5 * 60_000);
    expect(contarRapidos()).toEqual([0, 0, 0, 0, 0]);
    expect(contar('/abastecimentos')).toBe(0);
  });
});
