import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { FotoMiniaturaComponent } from './foto-miniatura';
import { FotosCache } from '../../services/fotos-cache';

describe('FotoMiniaturaComponent', () => {
  let fixture: ComponentFixture<FotoMiniaturaComponent>;
  let resposta: Subject<string>;
  let pedir: ReturnType<typeof vi.fn>;
  let observado: ((entradas: { isIntersecting: boolean }[]) => void) | null;
  const el = () => fixture.nativeElement as HTMLElement;

  async function criar(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FotoMiniaturaComponent],
      providers: [{ provide: FotosCache, useValue: { url: pedir } }],
    }).compileComponents();
    fixture = TestBed.createComponent(FotoMiniaturaComponent);
    fixture.componentRef.setInput('fotoId', 'f1');
    fixture.componentRef.setInput('alt', 'Medidor na abertura');
    fixture.detectChanges();
  }

  beforeEach(() => {
    resposta = new Subject<string>();
    pedir = vi.fn(() => resposta);
    observado = null;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('só pede a imagem quando aparece na tela', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) { observado = cb; }
      observe(): void {}
      disconnect(): void {}
    });
    await criar();
    expect(pedir).not.toHaveBeenCalled();
    expect(el().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Carregando: Medidor na abertura');

    observado!([{ isIntersecting: true }]);
    expect(pedir).toHaveBeenCalledWith('f1');
    resposta.next('blob:foto-1');
    fixture.detectChanges();
    const img = el().querySelector('img')!;
    expect(img.getAttribute('src')).toBe('blob:foto-1');
    expect(img.alt).toBe('Medidor na abertura');
  });

  it('sem IntersectionObserver no navegador: pede na hora', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    await criar();
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('erro: avisa e carregar() pede outra vez', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    await criar();
    resposta.error(new Error('falhou'));
    fixture.detectChanges();
    expect(el().textContent).toContain('Não carregou');

    resposta = new Subject<string>();
    fixture.componentInstance.carregar();
    expect(pedir).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.erro()).toBe(false);
  });
});
