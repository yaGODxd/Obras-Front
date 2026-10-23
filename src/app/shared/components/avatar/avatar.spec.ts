import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
  });

  async function montar(entradas: Record<string, unknown>): Promise<HTMLElement> {
    for (const [nome, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nome, valor);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  // O círculo da inicial é flex centralizado (não depende do "placeholder" do DaisyUI).
  function circuloDaInicial(el: HTMLElement): HTMLElement | null {
    return el.querySelector('[role="img"]');
  }

  it('com foto: <img> em base64 e alt com o nome', async () => {
    const el = await montar({ foto: 'QUJD', nome: 'Ana Souza' });
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,QUJD');
    expect(img.getAttribute('alt')).toBe('Foto de Ana Souza');
    expect(circuloDaInicial(el)).toBeNull();
  });

  it('sem foto (null, vazio ou só espaços): inicial centralizada, sem <img>', async () => {
    for (const foto of [null, '', '   ']) {
      const el = await montar({ foto, nome: 'joão', tamanho: 8 });
      expect(el.querySelector('img')).toBeNull();
      const circulo = circuloDaInicial(el)!;
      expect(circulo.textContent?.trim()).toBe('J');
      expect(circulo.getAttribute('aria-label')).toBe('joão');
      for (const c of ['flex', 'items-center', 'justify-center', 'rounded-full', 'w-8', 'h-8', 'bg-primary', 'text-primary-content']) {
        expect(circulo.classList).toContain(c);
      }
      expect(circulo.querySelector('span')?.classList).toContain('text-xs');
    }
  });

  it('foto que não carrega (evento error): cai para a inicial centralizada', async () => {
    const el = await montar({ foto: 'QUJD', nome: 'Ana Souza' });
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(el.querySelector('img')).toBeNull();
    expect(circuloDaInicial(el)?.textContent?.trim()).toBe('A');

    // Foto nova: tenta de novo.
    await montar({ foto: 'REVG' });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/jpeg;base64,REVG');
  });

  it('foto com quebras de linha e sem prefixo: limpa e prefixa como JPEG', async () => {
    const el = await montar({ foto: 'QUJD\nREVG\r\n', nome: 'Ana' });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/jpeg;base64,QUJDREVG');
  });

  it('foto que já vem com "data:": não prefixa de novo', async () => {
    const el = await montar({ foto: 'data:image/png;base64,UE5H\nSUhE', nome: 'Ana' });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,UE5HSUhE');
  });

  it('foto só com quebras de linha: inicial centralizada, sem <img>', async () => {
    const el = await montar({ foto: '\n\r\n  ', nome: 'Ana' });
    expect(el.querySelector('img')).toBeNull();
    expect(circuloDaInicial(el)?.textContent?.trim()).toBe('A');
  });

  it('foto limpa e prefixada que mesmo assim não abre (error): cai na inicial centralizada', async () => {
    const el = await montar({ foto: 'nao e\nimagem', nome: 'Ana Souza' });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/jpeg;base64,naoeimagem');
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(el.querySelector('img')).toBeNull();
    const circulo = circuloDaInicial(el)!;
    expect(circulo.textContent?.trim()).toBe('A');
    expect(circulo.classList).toContain('justify-center');
  });

  it('iniciais passadas por fora têm preferência', async () => {
    const el = await montar({ nome: 'Maria Clara', iniciais: 'MC' });
    expect(el.textContent?.trim()).toBe('MC');
  });

  it('src pronto (prévia de arquivo) tem preferência sobre a foto', async () => {
    const el = await montar({ foto: 'QUJD', src: 'data:image/png;base64,UE5H', nome: 'Ana' });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,UE5H');
  });

  it('cor de sucesso, tamanho 16 e classe extra (anel)', async () => {
    const el = await montar({ nome: 'Ana', cor: 'success', tamanho: 16, classe: 'ring-2 ring-primary' });
    const circulo = circuloDaInicial(el)!;
    for (const c of ['bg-success', 'text-success-content', 'w-16', 'h-16', 'ring-2', 'ring-primary']) {
      expect(circulo.classList).toContain(c);
    }
    expect(circulo.querySelector('span')?.classList).toContain('text-2xl');
  });
});
