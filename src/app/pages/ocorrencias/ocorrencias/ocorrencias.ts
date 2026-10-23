import { Component, OnInit, signal, computed, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OcorrenciaService } from '../../../services/ocorrencia';
import { OcorrenciaDetalhada, StatusOcorrencia } from '../../../interfaces/ocorrencia';
import { PaginacaoComponent } from '../../../shared/components/paginacao/paginacao';
import { inicioDoDiaLocal, fimDoDiaLocal } from '../../../shared/utils/datas';
import { ErroCarregarComponent } from '../../../shared/components/erro-carregar/erro-carregar';
import { mensagemDeErro } from '../../../shared/utils/erros';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { ModalOcorrenciaComponent } from '../../../shared/components/modal-ocorrencia/modal-ocorrencia';
import { badgeStatusOcorrencia, badgeTipoOcorrencia, rotuloStatusOcorrencia, statusDaOcorrencia } from '../../../shared/utils/ocorrencias';
import { ClicavelDirective } from '../../../shared/directives/clicavel';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { ehHorarioSuspeito } from '../../../shared/utils/horario-suspeito';
import { SeloHorarioSuspeitoComponent } from '../../../shared/components/selo-horario-suspeito/selo-horario-suspeito';

@Component({
  selector: 'app-ocorrencias',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent, ErroCarregarComponent, AvatarComponent, ModalOcorrenciaComponent, ClicavelDirective, StatusBadgeComponent, SeloHorarioSuspeitoComponent],
  templateUrl: './ocorrencias.html',
  styleUrl: './ocorrencias.css'
})
export class Ocorrencias implements OnInit {

  ocorrencias = signal<OcorrenciaDetalhada[]>([]);
  carregando = signal(true);
  erroCarregar = signal('');
  selecionada = signal<OcorrenciaDetalhada | null>(null);
  busca = signal('');
  filtroTipo = signal('');
  filtroStatus = signal<StatusOcorrencia | ''>('');
  readonly opcoesStatus: StatusOcorrencia[] = ['pendente', 'em_andamento', 'resolvida'];
  filtroSuspeito = signal(false);
  filtroInicio = signal('');
  filtroFim = signal('');

  tiposOcorrencia = computed(() => {
    const tipos = new Set(this.ocorrencias().map(o => o.tipo));
    return Array.from(tipos).sort();
  });

  ocorrenciasFiltradas = computed(() => {
    let lista = this.ocorrencias();
    const termo = this.busca().toLowerCase();
    if (termo) {
      lista = lista.filter(o =>
        o.tipo.toLowerCase().includes(termo) ||
        o.descricao.toLowerCase().includes(termo) ||
        o.motoristaNome.toLowerCase().includes(termo) ||
        o.veiculoDescricao.toLowerCase().includes(termo) ||
        (o.veiculoPlaca?.toLowerCase().includes(termo) ?? false)
      );
    }
    if (this.filtroTipo()) lista = lista.filter(o => o.tipo === this.filtroTipo());
    if (this.filtroStatus()) lista = lista.filter(o => statusDaOcorrencia(o) === this.filtroStatus());
    if (this.filtroSuspeito()) lista = lista.filter(ehHorarioSuspeito);
    const inicio = inicioDoDiaLocal(this.filtroInicio());
    if (inicio) {
      lista = lista.filter(o => o.registradoEm && new Date(o.registradoEm) >= inicio);
    }
    const fim = fimDoDiaLocal(this.filtroFim());
    if (fim) {
      lista = lista.filter(o => o.registradoEm && new Date(o.registradoEm) <= fim);
    }
    return lista;
  });

  totalOcorrencias = computed(() => this.ocorrenciasFiltradas().length);
  comLocalizacao = computed(() => this.ocorrenciasFiltradas().filter(o => o.latitude && o.longitude).length);

  constructor(private ocorrenciaService: OcorrenciaService, private router: Router) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erroCarregar.set('');
    this.ocorrenciaService.listarOcorrencias().subscribe({
      next: d => { this.ocorrencias.set(d); this.carregando.set(false); },
      error: e => { this.erroCarregar.set(mensagemDeErro(e)); this.carregando.set(false); }
    });
  }

  abrirModal(o: OcorrenciaDetalhada): void { this.selecionada.set(o); }
  fecharModal(): void { this.selecionada.set(null); }

  aoAlterarStatus(atualizada: OcorrenciaDetalhada): void {
    this.ocorrencias.update(lista => lista.map(o => o.id === atualizada.id ? atualizada : o));
    this.selecionada.set(atualizada);
  }

  irParaMotorista(login: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/ocorrencias/motorista', login]);
  }

  irParaVeiculo(veiculoId: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/ocorrencias/veiculo', veiculoId]);
  }

  limparFiltros(): void {
    this.paginaAtual.set(1);
    this.busca.set('');
    this.filtroTipo.set('');
    this.filtroStatus.set('');
    this.filtroSuspeito.set(false);
    this.filtroInicio.set('');
    this.filtroFim.set('');
  }

  badgeTipoOcorrencia = badgeTipoOcorrencia;
  badgeStatus = badgeStatusOcorrencia;
  rotuloStatus = rotuloStatusOcorrencia;
  status = statusDaOcorrencia;

  // Volta para a página 1 sempre que a busca ou um filtro muda.
  paginaAtual = linkedSignal({
    source: () => [this.busca(), this.filtroTipo(), this.filtroStatus(), this.filtroInicio(), this.filtroFim(), this.filtroSuspeito()],
    computation: () => 1
  });
  readonly porPagina = 10;

  ocorrenciasPaginadas = computed(() => {
    const inicio = (this.paginaAtual() - 1) * this.porPagina;
    return this.ocorrenciasFiltradas().slice(inicio, inicio + this.porPagina);
  });

  mudarPagina(p: number): void { this.paginaAtual.set(p); }
}