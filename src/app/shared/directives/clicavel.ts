import { Directive, ElementRef, inject } from '@angular/core';

// Para linhas e cards com (click) que não são <button>: entram no Tab e respondem a Enter/Espaço.
// Uso: <tr appClicavel (click)="...">
@Directive({
  selector: '[appClicavel]',
  standalone: true,
  host: {
    tabindex: '0',
    '[attr.role]': 'papel',
    class: 'cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2',
    '(keydown.enter)': 'ativar($event)',
    '(keydown.space)': 'ativar($event)'
  }
})
export class ClicavelDirective {
  private readonly el: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  // Linha e célula de tabela continuam sendo tabela para o leitor de tela; o resto vira "botão".
  readonly papel = this.el.tagName === 'TR' || this.el.tagName === 'TD' ? null : 'button';

  ativar(evento: Event): void {
    if (evento.target !== this.el) return; // Enter num botão de dentro da linha é do botão
    evento.preventDefault();
    this.el.click();
  }
}
