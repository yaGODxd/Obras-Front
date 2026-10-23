import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { FotosVinculadasComponent } from './fotos-vinculadas';
import { FotosCache } from '../../services/fotos-cache';
import { FotoDiario } from '../../../interfaces/foto';

function foto(id: string, vinculo: Partial<FotoDiario>): FotoDiario {
  return {
    id, diarioId: 'd1', tipo: 'cupom_fiscal', ocorrenciaId: null, abastecimentoId: null, tiradaEm: '2026-10-18T12:00:00Z',
    recebidaEm: '2026-10-18T12:05:00Z', tamanhoBytes: 1000, tipoMime: 'image/jpeg', hashSha256: 'h', idLocal: null, ...vinculo,
  };
}

const LISTA = [
  foto('f1', { abastecimentoId: 'a1' }),
  foto('f2', { tipo: 'bomba_comboio', abastecimentoId: 'a1', horarioSuspeito: true, motivoSuspeita: 'COMBOIO_SEM_DIARIO' }),
  foto('f3', { tipo: 'ocorrencia', ocorrenciaId: 'o1' }),
  foto('f4', { tipo: 'medidor_abertura' }),
];

describe('FotosVinculadasComponent', () => {
  let fixture: ComponentFixture<FotosVinculadasComponent>;
  let fotosDoDiario: ReturnType<typeof vi.fn>;
  const el = () => fixture.nativeElement as HTMLElement;
  const botoes = () => Array.from(el().querySelectorAll('li button')) as HTMLButtonElement[];

  async function criar(entradas: Record<string, string>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FotosVinculadasComponent],
      providers: [{ provide: FotosCache, useValue: { fotosDoDiario, url: () => NEVER } }],
    }).compileComponents();
    fixture = TestBed.createComponent(FotosVinculadasComponent);
    fixture.componentRef.setInput('diarioId', 'd1');
    for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
    await fixture.whenStable();
  }

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', undefined);
    fotosDoDiario = vi.fn(() => of(LISTA));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('abastecimento: só as fotos dele', async () => {
    await criar({ abastecimentoId: 'a1' });
    expect(fotosDoDiario).toHaveBeenCalledWith('d1');
    expect(botoes().map(b => b.getAttribute('aria-label'))).toEqual(['Ampliar foto: Cupom fiscal', 'Ampliar foto: Bomba do comboio']);
  });

  it('ocorrência: só as fotos dela', async () => {
    await criar({ ocorrenciaId: 'o1' });
    expect(botoes().map(b => b.getAttribute('aria-label'))).toEqual(['Ampliar foto: Ocorrência']);
  });

  it('sem fotos ligadas, ou se a lista falhar: não mostra nada', async () => {
    await criar({ abastecimentoId: 'a9' });
    expect(el().querySelector('ul')).toBeNull();

    TestBed.resetTestingModule();
    fotosDoDiario = vi.fn(() => throwError(() => new Error('falhou')));
    await criar({ abastecimentoId: 'a1' });
    expect(el().querySelector('ul')).toBeNull();
  });

  it('clicar amplia logo abaixo (com o horário suspeito e "Recebido pelo servidor"); clicar de novo fecha', async () => {
    await criar({ abastecimentoId: 'a1' });
    botoes()[1].click();
    await fixture.whenStable();
    expect(el().querySelector('figure')?.textContent).toContain('Bomba do comboio');
    expect(el().textContent).toContain('Comboio registrado por motorista');
    expect(el().textContent).toContain('Recebido pelo servidor em');
    expect(botoes()[1].getAttribute('aria-expanded')).toBe('true');

    botoes()[1].click();
    await fixture.whenStable();
    expect(el().querySelector('figure')).toBeNull();
  });
});
