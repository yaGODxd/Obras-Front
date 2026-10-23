import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('trata /login com parâmetros como tela de login (sem menu)', () => {
    const app = TestBed.createComponent(App).componentInstance;

    app.rotaAtual.set('/login?motivo=sessao-expirada');
    expect(app.mostrarLogin()).toBe(true);

    app.rotaAtual.set('/dashboard');
    expect(app.mostrarLogin()).toBe(false);
  });
});
