import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginacao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginacao.html'
})
export class PaginacaoComponent {

  total = input.required<number>();
  pagina = input.required<number>();
  porPagina = input<number>(15);

  paginaMudou = output<number>();

  totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()));

  paginas = computed(() => {
    const total = this.totalPaginas();
    const atual = this.pagina();
    const paginas: (number | '...')[] = [];

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    paginas.push(1);
    if (atual > 3) paginas.push('...');
    for (let i = Math.max(2, atual - 1); i <= Math.min(total - 1, atual + 1); i++) {
      paginas.push(i);
    }
    if (atual < total - 2) paginas.push('...');
    paginas.push(total);

    return paginas;
  });

  irPara(pagina: number | '...'): void {
    if (pagina === '...' || pagina === this.pagina()) return;
    this.paginaMudou.emit(pagina as number);
  }

  anterior(): void {
    if (this.pagina() > 1) this.paginaMudou.emit(this.pagina() - 1);
  }

  proximo(): void {
    if (this.pagina() < this.totalPaginas()) this.paginaMudou.emit(this.pagina() + 1);
  }
}