import { TestBed } from '@angular/core/testing';
import { AvisosComponent } from './avisos';
import { AvisosService } from '../../services/avisos';

describe('AvisosComponent', () => {
  it('mostra o texto como texto (nunca como HTML) e fecha pelo botão', async () => {
    const fixture = TestBed.createComponent(AvisosComponent);
    const avisos = TestBed.inject(AvisosService);
    const el: HTMLElement = fixture.nativeElement;

    avisos.erro('<img src=x onerror="alert(1)">');
    await fixture.whenStable();

    expect(el.querySelector('.alert-error span')?.textContent).toBe('<img src=x onerror="alert(1)">');
    expect(el.querySelector('img')).toBeNull();

    el.querySelector<HTMLButtonElement>('button[aria-label="Fechar aviso"]')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.alert')).toBeNull();
  });
});
