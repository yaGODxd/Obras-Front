import { Component, OnDestroy, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AbastecimentoService } from '../../../services/abastecimento';
import { AbastecimentoDetalhado } from '../../../interfaces/abastecimento';
import { ErroCarregarComponent } from '../../../shared/components/erro-carregar/erro-carregar';
import { ModalAbastecimentoComponent } from '../../../shared/components/modal-abastecimento/modal-abastecimento';
import { mensagemDeErro } from '../../../shared/utils/erros';
import { badgeCombustivel } from '../../../shared/utils/abastecimentos';
import { ClicavelDirective } from '../../../shared/directives/clicavel';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { SeloHorarioSuspeitoComponent } from '../../../shared/components/selo-horario-suspeito/selo-horario-suspeito';

Chart.register(...registerables);

// A mesma tela serve às rotas /abastecimentos/motorista/:login e /abastecimentos/veiculo/:id (data.por).
export type AbastecimentosPor = 'motorista' | 'veiculo';

const LAYOUT = { padding: { right: 20, bottom: 20 } };
const CORES_PIZZA = ['rgba(255, 193, 7, 0.8)', 'rgba(244, 67, 54, 0.8)', 'rgba(76, 175, 80, 0.8)', 'rgba(33, 150, 243, 0.8)'];

@Component({
  selector: 'app-abastecimentos-de',
  standalone: true,
  imports: [CommonModule, FormsModule, ErroCarregarComponent, ModalAbastecimentoComponent, ClicavelDirective, StatusBadgeComponent, SeloHorarioSuspeitoComponent],
  templateUrl: './abastecimentos-de.html'
})
export class AbastecimentosDeComponent implements OnInit, OnDestroy {

  @ViewChild('grafico1') grafico1?: ElementRef<HTMLCanvasElement>;
  @ViewChild('grafico2') grafico2?: ElementRef<HTMLCanvasElement>;
  @ViewChild('grafico3') grafico3?: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  por: AbastecimentosPor = 'motorista';
  // Login do motorista ou id do veículo, conforme "por".
  chave = '';
  abastecimentos = signal<AbastecimentoDetalhado[]>([]);
  carregando = signal(true);
  erroCarregar = signal('');
  selecionado = signal<AbastecimentoDetalhado | null>(null);
  busca = signal('');

  abastecimentosFiltrados = computed(() => {
    const termo = this.busca().toLowerCase();
    if (!termo) return this.abastecimentos();
    return this.abastecimentos().filter(a =>
      (this.por === 'motorista'
        ? a.veiculoDescricao.toLowerCase().includes(termo) || (a.veiculoPlaca?.toLowerCase().includes(termo) ?? false)
        : a.motoristaNome.toLowerCase().includes(termo)) ||
      a.tipoCombustivel.toLowerCase().includes(termo) ||
      (a.posto?.toLowerCase().includes(termo) ?? false)
    );
  });

  totalLitros = computed(() => this.abastecimentos().reduce((acc, a) => acc + a.litros, 0));
  totalValor = computed(() => this.abastecimentos().reduce((acc, a) => acc + a.valorTotal, 0));

  // Nome do motorista ou do veículo, tirado do primeiro registro.
  nomeMotorista = computed(() => this.abastecimentos()[0]?.motoristaNome ?? this.chave);
  nomeVeiculo = computed(() => this.abastecimentos()[0]?.veiculoDescricao ?? '');
  placaVeiculo = computed(() => this.abastecimentos()[0]?.veiculoPlaca ?? null);

  badgeCombustivel = badgeCombustivel;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private abastecimentoService: AbastecimentoService
  ) {}

  // Ao sair da tela: destrói os gráficos (o Chart.js guarda referências aos canvas).
  private destruido = false;

  ngOnDestroy(): void {
    this.destruido = true;
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  ngOnInit(): void {
    const snap = this.route.snapshot;
    this.por = snap.data['por'] === 'veiculo' ? 'veiculo' : 'motorista';
    this.chave = snap.paramMap.get(this.por === 'veiculo' ? 'id' : 'login') ?? '';
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erroCarregar.set('');
    const pedido = this.por === 'veiculo'
      ? this.abastecimentoService.listarAbastecimentosPorVeiculo(this.chave)
      : this.abastecimentoService.listarAbastecimentosPorMotorista(this.chave);
    pedido.subscribe({
      next: (data) => {
        this.abastecimentos.set(data);
        this.carregando.set(false);
        setTimeout(() => this.renderizarGraficos(), 300);
      },
      error: (e) => {
        this.erroCarregar.set(mensagemDeErro(e));
        this.carregando.set(false);
      }
    });
  }

  private renderizarGraficos(): void {
    if (this.destruido) return; // a tela fechou antes do setTimeout
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const dados = this.abastecimentos();
    if (dados.length === 0) return;

    // Motorista: mensal, combustível, por veículo. Veículo: mensal, evolução, combustível.
    const configs = this.por === 'motorista'
      ? [this.graficoMensal(dados), this.graficoCombustivel(dados), this.graficoPorVeiculo(dados)]
      : [this.graficoMensal(dados), this.graficoEvolucao(dados), this.graficoCombustivel(dados)];
    [this.grafico1, this.grafico2, this.grafico3].forEach((canvas, i) => {
      if (canvas) this.charts.push(new Chart(canvas.nativeElement, configs[i]));
    });
  }

  private porMes(dados: AbastecimentoDetalhado[]): Record<string, { litros: number; valor: number }> {
    const porMes: Record<string, { litros: number; valor: number }> = {};
    dados.forEach(a => {
      if (!a.registradoEm) return;
      const mes = new Date(a.registradoEm).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      if (!porMes[mes]) porMes[mes] = { litros: 0, valor: 0 };
      porMes[mes].litros += a.litros;
      porMes[mes].valor += a.valorTotal;
    });
    return porMes;
  }

  private somarLitros(dados: AbastecimentoDetalhado[], chave: (a: AbastecimentoDetalhado) => string): Record<string, number> {
    const soma: Record<string, number> = {};
    dados.forEach(a => { soma[chave(a)] = (soma[chave(a)] ?? 0) + a.litros; });
    return soma;
  }

  private graficoMensal(dados: AbastecimentoDetalhado[]): ChartConfiguration {
    const porMes = this.porMes(dados);
    const labels = Object.keys(porMes);
    return {
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
        layout: LAYOUT,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Litros e Valor por Mês' }
        },
        scales: {
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Litros' } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Valor (R$)' }, grid: { drawOnChartArea: false } }
        }
      }
    };
  }

  private graficoEvolucao(dados: AbastecimentoDetalhado[]): ChartConfiguration {
    const porMes = this.porMes(dados);
    const labels = Object.keys(porMes);
    return {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Litros consumidos',
          data: labels.map(l => porMes[l].litros),
          borderColor: '#3F51B5',
          backgroundColor: 'rgba(63, 81, 181, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: LAYOUT,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Evolução do Consumo' }
        },
        scales: { y: { title: { display: true, text: 'Litros' } } }
      }
    };
  }

  private graficoCombustivel(dados: AbastecimentoDetalhado[]): ChartConfiguration {
    const porCombustivel = this.somarLitros(dados, a => a.tipoCombustivel);
    return {
      type: 'pie',
      data: {
        labels: Object.keys(porCombustivel),
        datasets: [{
          data: Object.values(porCombustivel),
          backgroundColor: CORES_PIZZA.slice(0, Object.keys(porCombustivel).length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: LAYOUT,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Distribuição por Combustível (L)' }
        }
      }
    };
  }

  private graficoPorVeiculo(dados: AbastecimentoDetalhado[]): ChartConfiguration {
    const porVeiculo = this.somarLitros(dados, a => a.veiculoDescricao);
    return {
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
        layout: LAYOUT,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Litros por Veículo' }
        },
        scales: { y: { title: { display: true, text: 'Litros' } } }
      }
    };
  }

  scrollParaSlide(slideId: string): void {
    const el = document.getElementById(slideId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
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
}
