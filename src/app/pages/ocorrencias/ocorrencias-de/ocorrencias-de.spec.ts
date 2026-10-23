import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { OcorrenciasDeComponent } from './ocorrencias-de';
import { OcorrenciaDetalhada } from '../../../interfaces/ocorrencia';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

const ocorrencia = (id: string, tipo: string, motoristaNome: string): OcorrenciaDetalhada => ({
  id, diarioId: 'd1', tipo, descricao: 'Descrição', latitude: null, longitude: null, registradoEm: null,
  motoristaLogin: 'joao', motoristaNome, motoristaFoto: null, veiculoId: 'v1', veiculoDescricao: 'Caminhão 1',
  veiculoPlaca: null,
});

async function montar(por: 'motorista' | 'veiculo', params: Record<string, string>) {
  await TestBed.configureTestingModule({
    imports: [OcorrenciasDeComponent],
    providers: [
      provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { por }, paramMap: convertToParamMap(params) } } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(OcorrenciasDeComponent);
  await fixture.whenStable();
  return { fixture, api: TestBed.inject(HttpTestingController) };
}

describe('OcorrenciasDe (uma tela para motorista e veículo)', () => {
  it('por motorista: busca /ocorrencias/motorista/:login; resumo por tipo e coluna Veículo', async () => {
    const { fixture, api } = await montar('motorista', { login: 'joao' });
    api.expectOne(`${API}/ocorrencias/motorista/joao`).flush([
      ocorrencia('o1', 'Pneu furado', 'João'), ocorrencia('o2', 'Pneu furado', 'João'), ocorrencia('o3', 'Acidente', 'João'),
    ]);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Ocorrências do Motorista');
    expect(el.querySelector('thead')?.textContent).toContain('Veículo');
    expect(fixture.componentInstance.tiposOcorrencia()).toEqual(['Acidente', 'Pneu furado']);
    expect(fixture.componentInstance.getCountPorTipo('Pneu furado')).toBe(2);
  });

  it('por veículo: busca /ocorrencias/veiculo/:id e mostra a coluna Motorista', async () => {
    const { fixture, api } = await montar('veiculo', { id: 'v1' });
    api.expectOne(`${API}/ocorrencias/veiculo/v1`).flush([ocorrencia('o1', 'Pane', 'Maria')]);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Caminhão 1');
    expect(el.querySelector('thead')?.textContent).toContain('Motorista');
    expect(el.querySelector('tbody')?.textContent).toContain('Maria');
  });

  it('clicar na linha abre o modal compartilhado', async () => {
    const { fixture, api } = await montar('motorista', { login: 'joao' });
    api.expectOne(`${API}/ocorrencias/motorista/joao`).flush([ocorrencia('o1', 'Pane', 'João')]);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLElement>('tbody tr')!.click();
    await fixture.whenStable();
    expect(el.querySelector('app-modal-ocorrencia')?.textContent).toContain('Detalhes da Ocorrência');
  });
});
