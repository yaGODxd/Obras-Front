import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService, AbastecimentoDetalhado } from '../../../services/usuario';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-abastecimento-motorista',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './abastecimento-motorista.html',
  styleUrl: './abastecimento-motorista.css'
})
export class AbastecimentoMotoristaComponent implements OnInit {

  @ViewChild('grafico1') grafico1!: ElementRef;
  @ViewChild('grafico2') grafico2!: ElementRef;
  @ViewChild('grafico3') grafico3!: ElementRef;

  private charts: Chart[] = [];

  login = '';
  abastecimentos = signal<AbastecimentoDetalhado[]>([]);
  carregando = signal(true);
  selecionado = signal<AbastecimentoDetalhado | null>(null);
  busca = signal('');

  abastecimentosFiltrados = computed(() => {
    const termo = this.busca().toLowerCase();
    if (!termo) return this.abastecimentos();
    return this.abastecimentos().filter(a =>
      a.veiculoDescricao.toLowerCase().includes(termo) ||
      (a.veiculoPlaca?.toLowerCase().includes(termo) ?? false) ||
      a.tipoCombustivel.toLowerCase().includes(termo) ||
      (a.posto?.toLowerCase().includes(termo) ?? false)
    );
  });

  totalLitros = computed(() =>
    this.abastecimentos().reduce((acc, a) => acc + a.litros, 0)
  );

  totalValor = computed(() =>
    this.abastecimentos().reduce((acc, a) => acc + a.valorTotal, 0)
  );

  totalAbastecimentos = computed(() => this.abastecimentos().length);

  tiposCombustivel = computed(() => {
    const tipos = new Set(this.abastecimentos().map(a => a.tipoCombustivel));
    return Array.from(tipos).sort();
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.login = this.route.snapshot.paramMap.get('login') ?? '';
    this.usuarioService.listarAbastecimentosPorMotorista(this.login).subscribe({
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
      const nome = a.veiculoDescricao;
      if (!porVeiculo[nome]) porVeiculo[nome] = 0;
      porVeiculo[nome] += a.litros;
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

  getLitrosPorTipo(tipo: string): number {
    return this.abastecimentos().filter(a => a.tipoCombustivel === tipo).reduce((acc, a) => acc + a.litros, 0);
  }

  getValorPorTipo(tipo: string): number {
    return this.abastecimentos().filter(a => a.tipoCombustivel === tipo).reduce((acc, a) => acc + a.valorTotal, 0);
  }

  getCountPorTipo(tipo: string): number {
    return this.abastecimentos().filter(a => a.tipoCombustivel === tipo).length;
  }

  voltar(): void {
    this.router.navigate(['/abastecimentos']);
  }

  abrirModal(a: AbastecimentoDetalhado): void {
    this.selecionado.set(a);
  }

  fecharModal(): void {
    this.selecionado.set(null);
  }

  getCorCombustivel(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('diesel')) return 'badge-warning';
    if (t.includes('gasolina')) return 'badge-error';
    if (t.includes('etanol')) return 'badge-success';
    if (t.includes('gnv')) return 'badge-info';
    return 'badge-neutral';
  }
}