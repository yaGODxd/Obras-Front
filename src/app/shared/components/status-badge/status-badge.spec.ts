import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  async function badge(entradas: Record<string, unknown>): Promise<HTMLElement> {
    for (const [nome, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nome, valor);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.badge')!;
  }

  it('texto numa linha só, altura automática e corte com reticências (não vaza)', async () => {
    const el = await badge({ texto: 'Pendente de assinatura', cor: 'badge-info' });
    expect(el.classList).toContain('badge-info');
    expect(el.classList).toContain('whitespace-nowrap');
    expect(el.classList).toContain('h-auto');
    expect(el.classList).toContain('max-w-full');
    expect(el.querySelector('.truncate')?.textContent).toBe('Pendente de assinatura');
  });

  it('rótulo curto na tela e o completo no title', async () => {
    const el = await badge({ texto: 'Pendente', titulo: 'Pendente de assinatura', cor: 'badge-info' });
    expect(el.textContent?.trim()).toBe('Pendente');
    expect(el.getAttribute('title')).toBe('Pendente de assinatura');
  });

  it('sem título explícito, o title repete o texto (aparece quando corta)', async () => {
    const el = await badge({ texto: 'Manutenção Aberta' });
    expect(el.getAttribute('title')).toBe('Manutenção Aberta');
  });

  it('ícone opcional, escondido do leitor de tela', async () => {
    const el = await badge({ texto: 'Íntegro', icone: 'ti-circle-check' });
    const icone = el.querySelector('i')!;
    expect(icone.classList).toContain('ti-circle-check');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
  });
});
