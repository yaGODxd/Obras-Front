import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { AbastecimentosDeComponent } from './abastecimentos-de';
import { AbastecimentoDetalhado } from '../../../interfaces/abastecimento';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

const abastecimento = (id: string, motoristaNome: string, veiculoDescricao: string): AbastecimentoDetalhado => ({
  id, tipoCombustivel: 'Diesel', litros: 10, valorTotal: 60, posto: null, registradoEm: null,
  veiculoId: 'v1', veiculoDescricao, veiculoPlaca: 'ABC1D23', motoristaLogin: 'joao', motoristaNome,
  motoristaFoto: null, veiculoAbastecidoId: null, veiculoAbastecidoDescricao: null,
});

async function montar(por: 'motorista' | 'veiculo', params: Record<string, string>) {
  await TestBed.configureTestingModule({
    imports: [AbastecimentosDeComponent],
    providers: [
      provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { por }, paramMap: convertToParamMap(params) } } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AbastecimentosDeComponent);
  await fixture.whenStable();
  return { fixture, api: TestBed.inject(HttpTestingController) };
}

describe('AbastecimentosDe (uma tela para motorista e veículo)', () => {
  it('por motorista: busca /abastecimentos/motorista/:login e mostra a coluna Veículo', async () => {
    const { fixture, api } = await montar('motorista', { login: 'joao' });
    api.expectOne(`${API}/abastecimentos/motorista/joao`).flush([abastecimento('a1', 'João', 'Caminhão 1')]);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Abastecimentos do Motorista');
    expect(el.textContent).toContain('@joao');
    expect(el.querySelector('thead')?.textContent).toContain('Veículo');
    expect(el.querySelector('tbody')?.textContent).toContain('Caminhão 1');
  });

  it('por veículo: busca /abastecimentos/veiculo/:id, título com o veículo e coluna Motorista', async () => {
    const { fixture, api } = await montar('veiculo', { id: 'v1' });
    api.expectOne(`${API}/abastecimentos/veiculo/v1`).flush([abastecimento('a1', 'João', 'Caminhão 1')]);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Caminhão 1');
    expect(el.querySelector('thead')?.textContent).toContain('Motorista');
    expect(el.querySelector('tbody')?.textContent).toContain('João');
  });

  it('busca: no motorista procura pelo veículo; no veículo, pelo motorista', async () => {
    const { fixture, api } = await montar('veiculo', { id: 'v1' });
    api.expectOne(`${API}/abastecimentos/veiculo/v1`).flush([
      abastecimento('a1', 'João', 'Caminhão 1'), abastecimento('a2', 'Maria', 'Caminhão 1'),
    ]);
    fixture.componentInstance.busca.set('mar');
    expect(fixture.componentInstance.abastecimentosFiltrados().map(a => a.id)).toEqual(['a2']);
  });

  it('clicar na linha abre o modal compartilhado sem repetir o veículo', async () => {
    const { fixture, api } = await montar('veiculo', { id: 'v1' });
    api.expectOne(`${API}/abastecimentos/veiculo/v1`).flush([abastecimento('a1', 'João', 'Caminhão 1')]);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLElement>('tbody tr')!.click();
    await fixture.whenStable();
    const modal = el.querySelector('app-modal-abastecimento')!;
    expect(modal.textContent).toContain('Detalhes do Abastecimento');
    expect(modal.textContent).toContain('João');
    expect(modal.textContent).not.toContain('Caminhão 1');
  });
});
