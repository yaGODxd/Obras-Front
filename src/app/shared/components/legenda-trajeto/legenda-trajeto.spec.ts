import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegendaTrajetoComponent } from './legenda-trajeto';

describe('LegendaTrajetoComponent', () => {
  let fixture: ComponentFixture<LegendaTrajetoComponent>;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LegendaTrajetoComponent] }).compileComponents();
    fixture = TestBed.createComponent(LegendaTrajetoComponent);
    fixture.componentRef.setInput('quantidadePontos', 42);
  });

  it('pelas ruas: linha ajustada e pontos reais, sem aviso', async () => {
    fixture.componentRef.setInput('situacao', 'ajustado');
    await fixture.whenStable();
    expect(texto()).toContain('Linha ajustada às ruas');
    expect(texto()).toContain('Pontos reais (42)');
    expect(texto()).not.toContain('traçado aproximado');
  });

  it('calculando: mostra que está ajustando', async () => {
    fixture.componentRef.setInput('situacao', 'calculando');
    await fixture.whenStable();
    expect(texto()).toContain('Ajustando às ruas');
  });

  it('plano B: aviso discreto "traçado aproximado (pontos reais)" e a linha reta na legenda', async () => {
    fixture.componentRef.setInput('situacao', 'aproximado');
    await fixture.whenStable();
    expect(texto()).toContain('traçado aproximado (pontos reais)');
    expect(texto()).toContain('Linha reta entre os pontos reais');
    expect(texto()).toContain('Pontos reais (42)');
  });
});
