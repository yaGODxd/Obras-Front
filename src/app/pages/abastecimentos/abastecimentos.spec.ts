import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Abastecimentos } from './abastecimentos';
import { AbastecimentoDetalhado } from '../../interfaces/abastecimento';

describe('Abastecimentos', () => {
  let component: Abastecimentos;
  let fixture: ComponentFixture<Abastecimentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Abastecimentos],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Abastecimentos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filtro "Só horário a conferir": só os suspeitos; resposta antiga conta como normal; Limpar desliga', () => {
    const base: AbastecimentoDetalhado = {
      id: 'a1', tipoCombustivel: 'Diesel S10', litros: 10, valorTotal: 60, posto: null, registradoEm: '2026-10-18T10:00:00Z',
      veiculoId: 'v1', veiculoDescricao: 'Caminhão 1', veiculoPlaca: null, motoristaLogin: 'joao', motoristaNome: 'João',
      motoristaFoto: null, veiculoAbastecidoId: null, veiculoAbastecidoDescricao: null,
    };
    component.abastecimentos.set([
      base,
      { ...base, id: 'a2', horarioSuspeito: true, motivoSuspeita: 'HORARIO_FUTURO' },
      { ...base, id: 'a3', horarioSuspeito: false },
    ]);
    component.filtroSuspeito.set(true);
    expect(component.abastecimentosFiltrados().map(a => a.id)).toEqual(['a2']);

    component.limparFiltros();
    expect(component.filtroSuspeito()).toBe(false);
    expect(component.abastecimentosFiltrados().length).toBe(3);
  });
});
