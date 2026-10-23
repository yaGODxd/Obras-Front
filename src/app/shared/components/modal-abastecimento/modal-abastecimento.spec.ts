import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalAbastecimentoComponent } from './modal-abastecimento';
import { AbastecimentoDetalhado } from '../../../interfaces/abastecimento';

const abastecimento: AbastecimentoDetalhado = {
  id: 'a1', tipoCombustivel: 'Diesel S10', litros: 50, valorTotal: 300, posto: 'Posto Central',
  registradoEm: '2026-10-18T10:00:00', veiculoId: 'v1', veiculoDescricao: 'Caminhão 1', veiculoPlaca: 'ABC1D23',
  motoristaLogin: 'joao', motoristaNome: 'João', motoristaFoto: null,
  veiculoAbastecidoId: null, veiculoAbastecidoDescricao: null,
};

describe('ModalAbastecimentoComponent', () => {
  let fixture: ComponentFixture<ModalAbastecimentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModalAbastecimentoComponent] }).compileComponents();
    fixture = TestBed.createComponent(ModalAbastecimentoComponent);
    fixture.componentRef.setInput('abastecimento', abastecimento);
  });

  it('mostra os dados, o valor por litro e a cor do combustível', async () => {
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('João');
    expect(el.textContent).toContain('Caminhão 1');
    expect(el.textContent).toContain('ABC1D23');
    expect(el.textContent).toContain('6.00/L');
    expect(el.textContent).toContain('Posto Central');
    expect(el.querySelector('.badge-warning')?.textContent?.trim()).toBe('Diesel S10');
  });

  it('esconde o motorista (tela do motorista) ou o veículo (tela do veículo)', async () => {
    fixture.componentRef.setInput('mostrarMotorista', false);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('João');

    fixture.componentRef.setInput('mostrarMotorista', true);
    fixture.componentRef.setInput('mostrarVeiculo', false);
    await fixture.whenStable();
    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain('João');
    expect(texto).not.toContain('Caminhão 1');
    expect(texto).not.toContain('ABC1D23');
  });

  it('Fechar, X e fundo avisam o pai', async () => {
    await fixture.whenStable();
    let fechou = 0;
    fixture.componentInstance.fechar.subscribe(() => fechou++);
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')!.click();
    el.querySelector<HTMLButtonElement>('.modal-action .btn')!.click();
    el.querySelector<HTMLElement>('.modal-backdrop')!.click();
    expect(fechou).toBe(3);
  });

  it('horário suspeito: mostra o quadro com o motivo; normal não mostra', async () => {
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.textContent).not.toContain('Horário a conferir');

    fixture.componentRef.setInput('abastecimento', { ...abastecimento, horarioSuspeito: true, motivoSuspeita: 'COMBOIO_SEM_DIARIO' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Horário a conferir');
    expect(el.textContent).toContain('Comboio registrado por motorista que não dirigia um comboio nesse horário.');
  });
});
