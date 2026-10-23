import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeloHorarioSuspeitoComponent } from './selo-horario-suspeito';

describe('SeloHorarioSuspeitoComponent', () => {
  let fixture: ComponentFixture<SeloHorarioSuspeitoComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SeloHorarioSuspeitoComponent] }).compileComponents();
    fixture = TestBed.createComponent(SeloHorarioSuspeitoComponent);
  });

  it('suspeito: mostra o selo com a explicação no title', async () => {
    fixture.componentRef.setInput('registro', { horarioSuspeito: true, motivoSuspeita: 'DESVIO_RELOGIO' });
    await fixture.whenStable();
    expect(el().textContent?.trim()).toBe('Horário a conferir');
    expect(el().querySelector('.badge')?.getAttribute('title')).toBe('Relógio do celular estava mais de 5 min diferente do servidor.');
  });

  it('detalhado: um item por motivo e a hora em que o servidor recebeu', async () => {
    fixture.componentRef.setInput('registro', {
      horarioSuspeito: true, motivoSuspeita: 'HORARIO_FUTURO,CODIGO_NOVO', recebidoEm: '2026-10-20T14:00:00Z',
    });
    fixture.componentRef.setInput('detalhado', true);
    await fixture.whenStable();
    const itens = Array.from(el().querySelectorAll('li')).map(li => li.textContent?.trim());
    expect(itens).toEqual(['Horário do celular está no futuro.', 'CODIGO_NOVO']);
    expect(el().textContent).toContain('Recebido pelo servidor em');
    expect(el().querySelector('.badge')).toBeNull();
  });

  it('normal ou resposta antiga: não mostra nada', async () => {
    fixture.componentRef.setInput('registro', {});
    await fixture.whenStable();
    expect(el().querySelector('.badge')).toBeNull();

    fixture.componentRef.setInput('registro', { horarioSuspeito: false });
    await fixture.whenStable();
    expect(el().querySelector('.badge')).toBeNull();
  });
});
