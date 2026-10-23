import { Component, OnDestroy, OnInit, signal, computed, linkedSignal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AbastecimentoService } from '../../services/abastecimento';
import { AbastecimentoDetalhado } from '../../interfaces/abastecimento';
import { Chart, registerables } from 'chart.js';
import { PaginacaoComponent } from '../../shared/components/paginacao/paginacao';
import { inicioDoDiaLocal, fimDoDiaLocal } from '../../shared/utils/datas';
import { ErroCarregarComponent } from '../../shared/components/erro-carregar/erro-carregar';
import { mensagemDeErro } from '../../shared/utils/erros';

Chart.register(...registerables);
import { AvatarComponent } from '../../shared/components/avatar/avatar';
import { ModalAbastecimentoComponent } from '../../shared/components/modal-abastecimento/modal-abastecimento';
import { ClicavelDirective } from '../../shared/directives/clicavel';
import { ehHorarioSuspeito } from '../../shared/utils/horario-suspeito';
import { SeloHorarioSuspeitoComponent } from '../../shared/components/selo-horario-suspeito/selo-horario-suspeito';

@Component({
  selector: 'app-abastecimentos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent, ErroCarregarComponent, AvatarComponent, ModalAbastecimentoComponent, ClicavelDirective, SeloHorarioSuspeitoComponent],
  templateUrl: './abastecimentos.html',
  styleUrl: './abastecimentos.css'
})
export class Abastecimentos implements OnInit, OnDestroy {

  @ViewChild('grafico1') grafico1!: ElementRef;
  @ViewChild('grafico2') grafico2!: ElementRef;
  @ViewChild('grafico3') grafico3!: ElementRef;

  private charts: Chart[] = [];

  abastecimentos = signal<AbastecimentoDetalhado[]>([]);
  carregando = signal(true);
  erroCarregar = signal('');
  busca = signal('');
  selecionado = signal<AbastecimentoDetalhado | null>(null);
  filtroTipo = signal('');
  filtroSuspeito = signal(false);
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
    if (this.filtroSuspeito()) lista = lista.filter(ehHorarioSuspeito);
    const inicio = inicioDoDiaLocal(this.filtroInicio());
    if (inicio) {
      lista = lista.filter(a => a.registradoEm && new Date(a.registradoEm) >= inicio);
    }
    const fim = fimDoDiaLocal(this.filtroFim());
    if (fim) {
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
    private abastecimentoService: AbastecimentoService,
    private router: Router
  ) {}

  // Ao sair da tela: destrói os gráficos (o Chart.js guarda referências aos canvas).
  private destruido = false;

  ngOnDestroy(): void {
    this.destruido = true;
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erroCarregar.set('');
    this.abastecimentoService.listarAbastecimentos().subscribe({
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
    this.filtroSuspeito.set(false);
    this.filtroInicio.set('');
    this.filtroFim.set('');
  }


// Volta para a página 1 sempre que a busca ou um filtro muda.
paginaAtual = linkedSignal({
  source: () => [this.busca(), this.filtroTipo(), this.filtroInicio(), this.filtroFim(), this.filtroSuspeito()],
  computation: () => 1
});
readonly porPagina = 10;

abastecimentosPaginados = computed(() => {
  const inicio = (this.paginaAtual() - 1) * this.porPagina;
  return this.abastecimentosFiltrados().slice(inicio, inicio + this.porPagina);
});

mudarPagina(p: number): void {
  this.paginaAtual.set(p);
}
}