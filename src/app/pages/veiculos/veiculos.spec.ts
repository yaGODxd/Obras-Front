import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Veiculos } from './veiculos';
import { environment } from '../../../environments/environment';

const URL_VEICULOS = `${environment.apiUrl}/veiculos`;

describe('Veiculos', () => {
  let component: Veiculos;
  let fixture: ComponentFixture<Veiculos>;
  let api: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Veiculos],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Veiculos);
    component = fixture.componentInstance;
    api = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('volta para a página 1 quando a busca ou o filtro muda', () => {
    component.mudarPagina(3);
    expect(component.paginaAtual()).toBe(3);

    component.busca.set('caminhão');
    expect(component.paginaAtual()).toBe(1);

    component.mudarPagina(2);
    component.filtroStatus.set('em_manutencao');
    expect(component.paginaAtual()).toBe(1);
  });

  it('o filtro de status inclui "Em manutenção"', () => {
    expect(component.statusVeiculo.map(s => s.rotulo)).toContain('Em manutenção');
  });

  it('erro ao carregar é diferente de lista vazia, e "Tentar de novo" recarrega', async () => {
    api.expectOne(URL_VEICULOS).flush(null, { status: 500, statusText: 'Erro' });
    await fixture.whenStable();

    expect(texto()).toContain('Não foi possível carregar os dados.');
    expect(texto()).toContain('Erro no servidor');
    expect(texto()).not.toContain('Nenhum veículo encontrado');

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    api.expectOne(URL_VEICULOS).flush([]);
    await fixture.whenStable();

    expect(texto()).toContain('Nenhum veículo encontrado');
    expect(texto()).not.toContain('Não foi possível carregar');
  });
});
