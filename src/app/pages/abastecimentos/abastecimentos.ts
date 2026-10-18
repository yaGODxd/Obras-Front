import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService, AbastecimentoDetalhado } from '../../services/usuario';
import { Chart, registerables } from 'chart.js';
import { PaginacaoComponent } from '../../shared/components/paginacao/paginacao';

Chart.register(...registerables);

@Component({
  selector: 'app-abastecimentos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent],
  templateUrl: './abastecimentos.html',
  styleUrl: './abastecimentos.css'
})
export class Abastecimentos implements OnInit {

  @ViewChild('grafico1') grafico1!: ElementRef;
  @ViewChild('grafico2') grafico2!: ElementRef;
  @ViewChild('grafico3') grafico3!: ElementRef;

  private charts: Chart[] = [];

  abastecimentos = signal<AbastecimentoDetalhado[]>([]);
  carregando = signal(true);
  busca = signal('');
  selecionado = signal<AbastecimentoDetalhado | null>(null);
  filtroTipo = signal('');
  filtroInicio = signal('');
  filtroFim = signal('');

  tiposCombustivel = computed(() => {
    const tipos = new Set(this.abastecimentos().map(a => a.tipoCombustivel));
    return Array.from(tipos).sort();
  });

  abastecimentosFiltrados = computed(() => {
    let lista = this.abastecimentos();
    const termo = this.busca().toLowerCase();
    if (termo) {
      lista = lista.filter(a =>
        a.motoristaNome.toLowerCase().includes(termo) ||
        a.veiculoDescricao.toLowerCase().includes(termo) ||
        (a.veiculoPlaca?.toLowerCase().includes(termo) ?? false) ||
        a.tipoCombustivel.toLowerCase().includes(termo) ||
        (a.posto?.toLowerCase().includes(termo) ?? false)
      );
    }
    if (this.filtroTipo()) {
      lista = lista.filter(a => a.tipoCombustivel === this.filtroTipo());
    }
    if (this.filtroInicio()) {
      const inicio = new Date(this.filtroInicio());
      lista = lista.filter(a => a.registradoEm && new Date(a.registradoEm) >= inicio);
    }
    if (this.filtroFim()) {
      const fim = new Date(this.filtroFim());
      fim.setHours(23, 59, 59);
      lista = lista.filter(a => a.registradoEm && new Date(a.registradoEm) <= fim);
    }
    return lista;
  });

  totalLitros = computed(() =>
    this.abastecimentosFiltrados().reduce((acc, a) => acc + a.litros, 0)
  );

  totalValor = computed(() =>
    this.abastecimentosFiltrados().reduce((acc, a) => acc + a.valorTotal, 0)
  );

  constructor(
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuarioService.listarAbastecimentos().subscribe({
      next: (data) => {
        this.abastecimentos.set(data);
        this.carregando.set(false);
        setTimeout(() => this.renderizarGraficos(), 300);
      },
      error: () => this.carregando.set(false)
    });
  }

  private renderizarGraficos(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const dados = this.abastecimentos();
    if (dados.length === 0) return;

    const porMes: Record<string, { litros: number; valor: number }> = {};
    dados.forEach(a => {
      if (!a.registradoEm) return;
      const mes = new Date(a.registradoEm).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      if (!porMes[mes]) porMes[mes] = { litros: 0, valor: 0 };
      porMes[mes].litros += a.litros;
      porMes[mes].valor += a.valorTotal;
    });
    const labels = Object.keys(porMes);

    const porCombustivel: Record<string, number> = {};
    dados.forEach(a => {
      if (!porCombustivel[a.tipoCombustivel]) porCombustivel[a.tipoCombustivel] = 0;
      porCombustivel[a.tipoCombustivel] += a.litros;
    });

    const porVeiculo: Record<string, number> = {};
    dados.forEach(a => {
      if (!porVeiculo[a.veiculoDescricao]) porVeiculo[a.veiculoDescricao] = 0;
      porVeiculo[a.veiculoDescricao] += a.litros;
    });

    const layoutPadding = { padding: { right: 20, bottom: 20 } };

    if (this.grafico1) {
      this.charts.push(new Chart(this.grafico1.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Litros',
              data: labels.map(l => porMes[l].litros),
              backgroundColor: 'rgba(63, 81, 181, 0.7)',
              borderColor: '#3F51B5',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: 'Valor (R$)',
              data: labels.map(l => porMes[l].valor),
              backgroundColor: 'rgba(76, 175, 80, 0.7)',
              borderColor: '#4CAF50',
              borderWidth: 1,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: layoutPadding,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Litros e Valor por Mês' }
          },
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: 'Litros' } },
            y1: { type: 'linear', position: 'right', title: { display: true, text: 'Valor (R$)' }, grid: { drawOnChartArea: false } }
          }
        }
      }));
    }

    if (this.grafico2) {
      const cores = ['rgba(255, 193, 7, 0.8)', 'rgba(244, 67, 54, 0.8)', 'rgba(76, 175, 80, 0.8)', 'rgba(33, 150, 243, 0.8)'];
      this.charts.push(new Chart(this.grafico2.nativeElement, {
        type: 'pie',
        data: {
          labels: Object.keys(porCombustivel),
          datasets: [{
            data: Object.values(porCombustivel),
            backgroundColor: cores.slice(0, Object.keys(porCombustivel).length),
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: layoutPadding,
          plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: 'Distribuição por Combustível (L)' }
          }
        }
      }));
    }

    if (this.grafico3) {
      this.charts.push(new Chart(this.grafico3.nativeElement, {
        type: 'bar',
        data: {
          labels: Object.keys(porVeiculo),
          datasets: [{
            label: 'Litros',
            data: Object.values(porVeiculo),
            backgroundColor: 'rgba(63, 81, 181, 0.7)',
            borderColor: '#3F51B5',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: layoutPadding,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Litros por Veículo' }
          },
          scales: { y: { title: { display: true, text: 'Litros' } } }
        }
      }));
    }
  }

  scrollParaSlide(slideId: string): void {
    const el = document.getElementById(slideId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }

  irParaMotorista(login: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/abastecimentos/motorista', login]);
  }

  irParaVeiculo(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/abastecimentos/veiculo', id]);
  }

  abrirModal(abastecimento: AbastecimentoDetalhado): void {
    this.selecionado.set(abastecimento);
  }

  fecharModal(): void {
    this.selecionado.set(null);
  }

  limparFiltros(): void {
    this.paginaAtual.set(1);
    this.busca.set('');
    this.filtroTipo.set('');
    this.filtroInicio.set('');
    this.filtroFim.set('');
  }

  getCorCombustivel(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('diesel')) return 'badge-warning';
    if (t.includes('gasolina')) return 'badge-error';
    if (t.includes('etanol')) return 'badge-success';
    if (t.includes('gnv')) return 'badge-info';
    return 'badge-neutral';
  }

paginaAtual = signal(1);
readonly porPagina = 10;

abastecimentosPaginados = computed(() => {
  const inicio = (this.paginaAtual() - 1) * this.porPagina;
  return this.abastecimentosFiltrados().slice(inicio, inicio + this.porPagina);
});

mudarPagina(p: number): void {
  this.paginaAtual.set(p);
}
}