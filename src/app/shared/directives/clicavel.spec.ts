import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClicavelDirective } from './clicavel';

@Component({
  standalone: true,
  imports: [ClicavelDirective],
  template: `
    <table><tbody><tr id="linha" appClicavel (click)="cliquesLinha = cliquesLinha + 1"><td>Caminhão 1</td></tr></tbody></table>
    <div id="card" appClicavel (click)="cliquesCard = cliquesCard + 1">
      Card
      <button id="dentro" (click)="$event.stopPropagation()">Botão de dentro</button>
    </div>
  `
})
class TelaClicavel {
  cliquesLinha = 0;
  cliquesCard = 0;
}

function tecla(alvo: Element, key: string): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  alvo.dispatchEvent(evento);
  return evento;
}

describe('ClicavelDirective', () => {
  async function criar() {
    const fixture = TestBed.createComponent(TelaClicavel);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    return { tela: fixture.componentInstance, linha: el.querySelector('#linha')!, card: el.querySelector('#card')!, dentro: el.querySelector('#dentro')! };
  }

  it('entra no Tab', async () => {
    const { linha, card } = await criar();
    expect(linha.getAttribute('tabindex')).toBe('0');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('card vira "botão" para o leitor de tela; linha de tabela continua linha', async () => {
    const { linha, card } = await criar();
    expect(card.getAttribute('role')).toBe('button');
    expect(linha.hasAttribute('role')).toBe(false);
  });

  it('Enter e Espaço ativam o clique (e o Espaço não rola a página)', async () => {
    const { tela, linha, card } = await criar();

    tecla(linha, 'Enter');
    expect(tela.cliquesLinha).toBe(1);

    const espaco = tecla(card, ' ');
    expect(tela.cliquesCard).toBe(1);
    expect(espaco.defaultPrevented).toBe(true);
  });

  it('Enter num botão de dentro não ativa o card de fora', async () => {
    const { tela, dentro } = await criar();
    tecla(dentro, 'Enter');
    expect(tela.cliquesCard).toBe(0);
  });
});
