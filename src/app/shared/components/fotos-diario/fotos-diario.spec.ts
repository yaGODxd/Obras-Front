import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FotosDiarioComponent } from './fotos-diario';
import { FotosCache } from '../../services/fotos-cache';
import { FotoDiario } from '../../../interfaces/foto';

function foto(id: string, tipo: FotoDiario['tipo'], tiradaEm: string, extra: Partial<FotoDiario> = {}): FotoDiario {
  return {
    id, diarioId: 'd1', tipo, ocorrenciaId: null, abastecimentoId: null, tiradaEm, recebidaEm: null,
    tamanhoBytes: 300 * 1024, tipoMime: 'image/jpeg', hashSha256: 'h', idLocal: null, ...extra,
  };
}

describe('FotosDiarioComponent', () => {
  let fixture: ComponentFixture<FotosDiarioComponent>;
  let lista: Subject<FotoDiario[]>;
  let fotosDoDiario: ReturnType<typeof vi.fn>;
  let url: ReturnType<typeof vi.fn>;
  const el = () => fixture.nativeElement as HTMLElement;
  const botao = (texto: string) => Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes(texto));

  beforeEach(async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    lista = new Subject<FotoDiario[]>();
    fotosDoDiario = vi.fn(() => lista);
    url = vi.fn(() => NEVER);
    await TestBed.configureTestingModule({
      imports: [FotosDiarioComponent],
      providers: [{ provide: FotosCache, useValue: { fotosDoDiario, url } }],
    }).compileComponents();
    fixture = TestBed.createComponent(FotosDiarioComponent);
    fixture.componentRef.setInput('diarioId', 'd1');
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('não busca nada até abrir a seção', () => {
    expect(fotosDoDiario).not.toHaveBeenCalled();
    expect(botao('Mostrar fotos')).toBeTruthy();
  });

  it('abrir: busca a lista, mostra em ordem de horário e cada miniatura pede a sua imagem', async () => {
    botao('Mostrar fotos')!.click();
    expect(fotosDoDiario).toHaveBeenCalledWith('d1');
    lista.next([
      foto('f2', 'medidor_fechamento', '2026-10-18T19:00:00Z'),
      foto('f1', 'medidor_abertura', '2026-10-18T11:00:00Z', { horarioSuspeito: true, motivoSuspeita: 'DESVIO_RELOGIO' }),
    ]);
    await fixture.whenStable();

    const rotulos = Array.from(el().querySelectorAll('li button')).map(b => b.getAttribute('aria-label'));
    expect(rotulos).toEqual(['Ampliar foto: Medidor na abertura', 'Ampliar foto: Medidor no fechamento']);
    expect(url.mock.calls.map(c => c[0])).toEqual(['f1', 'f2']);
    expect(el().textContent).toContain('Horário a conferir');
  });

  it('lista vazia (o app ainda não manda fotos)', async () => {
    botao('Mostrar fotos')!.click();
    lista.next([]);
    await fixture.whenStable();
    expect(el().textContent).toContain('Nenhuma foto neste diário.');
  });

  it('ampliar mostra só a foto escolhida, grande; "Voltar" retorna às miniaturas', async () => {
    botao('Mostrar fotos')!.click();
    lista.next([foto('f1', 'cupom_fiscal', '2026-10-18T11:00:00Z')]);
    await fixture.whenStable();

    (el().querySelector('li button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el().querySelector('figure')).not.toBeNull();
    expect(el().querySelector('figure')?.textContent).toContain('Cupom fiscal');
    expect(el().querySelector('ul')).toBeNull();

    botao('Voltar às miniaturas')!.click();
    await fixture.whenStable();
    expect(el().querySelector('figure')).toBeNull();
    expect(el().querySelectorAll('li').length).toBe(1);
  });

  it('erro ao buscar a lista: mensagem e "Tentar de novo"', async () => {
    fotosDoDiario.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    botao('Mostrar fotos')!.click();
    await fixture.whenStable();
    expect(el().textContent).toContain('O servidor está iniciando');

    fotosDoDiario.mockReturnValueOnce(of([]));
    botao('Tentar de novo')!.click();
    await fixture.whenStable();
    expect(el().textContent).toContain('Nenhuma foto neste diário.');
  });

  it('trocar de diário fecha a seção', async () => {
    botao('Mostrar fotos')!.click();
    fixture.componentRef.setInput('diarioId', 'd2');
    await fixture.whenStable();
    expect(fixture.componentInstance.aberta()).toBe(false);
    expect(botao('Mostrar fotos')).toBeTruthy();
  });
});
