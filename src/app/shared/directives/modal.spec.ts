import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalDirective } from './modal';

@Component({
  standalone: true,
  imports: [ModalDirective],
  template: `
    <button id="abrir" (click)="aberto.set(true)">Abrir</button>
    @if (aberto()) {
      <div class="modal modal-open" appModal (fechar)="aberto.set(false)">
        <div class="modal-box">
          <button id="fechar-x" aria-label="Fechar">x</button>
          <h3>Novo Usuário</h3>
          <input id="campo" />
          <button id="salvar">Salvar</button>
        </div>
      </div>
    }
  `
})
class TelaComModal {
  aberto = signal(false);
}

function tecla(alvo: Element, key: string, shiftKey = false): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  alvo.dispatchEvent(evento);
  return evento;
}

describe('ModalDirective', () => {
  let fixture: ComponentFixture<TelaComModal>;
  let el: HTMLElement;

  async function abrir(): Promise<HTMLElement> {
    el.querySelector<HTMLButtonElement>('#abrir')!.focus();
    fixture.componentInstance.aberto.set(true);
    await fixture.whenStable();
    return el.querySelector<HTMLElement>('[appModal]')!;
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(TelaComModal);
    el = fixture.nativeElement;
    document.body.appendChild(el); // foco só funciona em elemento que está na página
    await fixture.whenStable();
  });

  afterEach(() => el.remove());

  it('é lido como diálogo, com o título do modal', async () => {
    const modal = await abrir();
    const titulo = el.querySelector('h3')!;

    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(titulo.id).not.toBe('');
  });

  it('ao abrir, o foco vai para o primeiro campo (e não para o X)', async () => {
    await abrir();
    expect(document.activeElement?.id).toBe('campo');
  });

  it('Esc fecha o modal e o foco volta para quem abriu', async () => {
    const modal = await abrir();

    tecla(modal, 'Escape');
    await fixture.whenStable();

    expect(el.querySelector('[appModal]')).toBeNull();
    expect(document.activeElement?.id).toBe('abrir');
  });

  it('Tab não sai do modal: do último vai para o primeiro, e Shift+Tab ao contrário', async () => {
    await abrir();
    const primeiro = el.querySelector<HTMLElement>('#fechar-x')!;
    const ultimo = el.querySelector<HTMLElement>('#salvar')!;

    ultimo.focus();
    expect(tecla(ultimo, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(primeiro);

    expect(tecla(primeiro, 'Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(ultimo);
  });

  it('Tab no meio do modal segue o caminho normal', async () => {
    await abrir();
    const campo = el.querySelector<HTMLElement>('#campo')!;
    expect(tecla(campo, 'Tab').defaultPrevented).toBe(false);
  });
});
