import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RelatoriosComponent } from './relatorios';
import { DiarioResponse, StatusDiario } from '../../../interfaces/diario';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

function diario(id: string, status: StatusDiario): DiarioResponse {
  return {
    id, status, veiculoDescricao: 'Caminhão 1', veiculoPlaca: null, motoristaNome: `Motorista ${id}`,
    medidorInicial: 100, medidorFinal: 150, medidorPercorrido: 50, destino: null,
    abertoEm: '2026-10-18T11:00:00Z', fechadoEm: null,
  };
}

describe('RelatoriosComponent', () => {
  let component: RelatoriosComponent;
  let fixture: ComponentFixture<RelatoriosComponent>;
  let api: HttpTestingController;
  let arquivos: Blob[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatoriosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatoriosComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    // O jsdom não baixa arquivos: guarda o CSV gerado para conferir.
    arquivos = [];
    URL.createObjectURL = vi.fn((blob: Blob) => { arquivos.push(blob); return 'blob:teste'; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  async function gerarCsvDiarios(lista: DiarioResponse[]): Promise<string[]> {
    component.tipoRelatorio.set('diarios');
    component.gerarCSV();
    api.expectOne(r => r.url.startsWith(`${API}/diarios`)).flush(lista);
    // BOM UTF-8 (EF BB BF) no início: acentos certos no Excel. O .text() remove o BOM ao ler, por isso os bytes.
    const bytes = new Uint8Array(await arquivos[0].arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    return (await arquivos[0].text()).replace('﻿', '').trim().split('\r\n');
  }

  const lista = [diario('1', 'aberto'), diario('2', 'fechado'), diario('3', 'assinado')];

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('com um veículo escolhido, o relatório de diários não sai mais vazio', async () => {
    component.filtroVeiculoId.set('v1');
    const linhas = await gerarCsvDiarios(lista);

    expect(linhas.length).toBe(3); // cabeçalho + fechado + assinado
  });

  it('não inclui abertos e mostra a situação de cada diário', async () => {
    const [cabecalho, ...linhas] = await gerarCsvDiarios(lista);

    expect(cabecalho.endsWith('Situação')).toBe(true);
    expect(linhas.some(l => l.includes('Motorista 1'))).toBe(false);
    expect(linhas.find(l => l.includes('Motorista 2'))?.endsWith('Pendente de assinatura')).toBe(true);
    expect(linhas.find(l => l.includes('Motorista 3'))?.endsWith('Assinado')).toBe(true);
  });

  it('formato do Excel em português: ";", vírgula decimal e data dd/MM/aaaa HH:mm', async () => {
    const d = { ...diario('9', 'assinado'), medidorInicial: 1234.5, medidorFinal: -12.5, destino: '=SOMA(A1)' };
    const [cabecalho, linha] = await gerarCsvDiarios([d]);

    expect(cabecalho.split(';').length).toBe(10);
    const colunas = linha.split(';');
    expect(colunas[0]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(colunas[5]).toBe("'=SOMA(A1)"); // texto digitado: protegido contra fórmula
    expect(colunas[6]).toBe('1234,5');
    expect(colunas[7]).toBe('-12,5');      // número: nunca recebe o prefixo
  });

  it('"Somente assinados" deixa só os assinados', async () => {
    component.somenteAssinados.set(true);
    const [, ...linhas] = await gerarCsvDiarios(lista);

    expect(linhas.length).toBe(1);
    expect(linhas[0]).toContain('Motorista 3');
  });
});
