import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, output } from '@angular/core';

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let proximoId = 0;

// Acessibilidade dos modais do DaisyUI (<div class="modal modal-open" appModal (fechar)="...">):
// role="dialog", título lido pelo leitor de tela, Esc fecha, Tab não sai do modal,
// foco vai para o primeiro campo ao abrir e volta para quem abriu ao fechar.
@Directive({
  selector: '[appModal]',
  standalone: true,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    '(keydown)': 'aoTeclar($event)'
  }
})
export class ModalDirective implements AfterViewInit, OnDestroy {
  fechar = output<void>();

  private readonly el: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  ngAfterViewInit(): void {
    const titulo = this.el.querySelector('h3');
    if (titulo) {
      titulo.id ||= `modal-titulo-${++proximoId}`;
      this.el.setAttribute('aria-labelledby', titulo.id);
    }
    const campo = this.el.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
    const caixa = this.el.querySelector<HTMLElement>('.modal-box');
    if (campo) {
      campo.focus();
    } else if (caixa) {
      caixa.tabIndex = -1;
      caixa.focus();
    }
  }

  ngOnDestroy(): void {
    if (this.focoAnterior?.isConnected) this.focoAnterior.focus();
  }

  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      this.fechar.emit();
      return;
    }
    if (evento.key !== 'Tab') return;

    const focaveis = Array.from(this.el.querySelectorAll<HTMLElement>(FOCAVEIS));
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const atual = document.activeElement;

    if (evento.shiftKey && (atual === primeiro || !this.el.contains(atual))) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && (atual === ultimo || !this.el.contains(atual))) {
      evento.preventDefault();
      primeiro.focus();
    }
  }
}
