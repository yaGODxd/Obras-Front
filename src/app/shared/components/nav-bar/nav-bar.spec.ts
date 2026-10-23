import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { NavBar } from './nav-bar';

describe('NavBar', () => {
  let component: NavBar;
  let fixture: ComponentFixture<NavBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBar],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sair apaga a sessão, mantém o tema e vai para o login', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem('token', 't');
    localStorage.setItem('tema', 'obras-ocean');

    component.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('tema')).toBe('obras-ocean');
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('começa aberto no computador', () => {
    expect(component.sidebarAberta).toBe(true);
    expect(component.menuMovelAberto()).toBe(false);
  });

  it('celular: o botão do topo abre o menu, e Esc fecha', async () => {
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('button[aria-label="Abrir menu"]')!.click();
    expect(component.menuMovelAberto()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.menuMovelAberto()).toBe(false);
  });

  it('celular: escolher uma tela fecha o menu', async () => {
    component.abrirMenuMovel();
    await TestBed.inject(Router).navigateByUrl('/');
    expect(component.menuMovelAberto()).toBe(false);
  });

  it('o link de Ocorrências tem o nome certo (antes aparecia "Estoque")', async () => {
    const el: HTMLElement = fixture.nativeElement;
    // O grupo "Operacional" começa fechado: abre com um clique, como o usuário faz.
    const botaoGrupo = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Operacional'))!;
    botaoGrupo.click();
    await fixture.whenStable();
    expect(el.querySelector('[data-tip="Estoque"]')).toBeNull();
    expect(el.querySelector('a[href="/ocorrencias"]')?.textContent).toContain('Ocorrências');
  });
});
