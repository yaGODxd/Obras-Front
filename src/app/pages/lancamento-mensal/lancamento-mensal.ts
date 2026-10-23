import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AbastecimentoService } from '../../services/abastecimento';
import { ChecklistService } from '../../services/checklist';
import { DiarioService } from '../../services/diario';
import { OcorrenciaService } from '../../services/ocorrencia';
import { RastreamentoService } from '../../services/rastreamento';
import { VeiculoService } from '../../services/veiculo';
import { ChecklistRespostaResponse } from '../../interfaces/checklist';
import { DiarioResponse, DiarioResumoMensal } from '../../interfaces/diario';
import { PontoRastreamento } from '../../interfaces/rastreamento';
import { VeiculoResponse } from '../../interfaces/veiculo';
import * as L from 'leaflet';
import { badgeStatusDiario, rotuloCurtoStatusDiario, rotuloStatusDiario } from '../../shared/utils/diarios';
import { mensagemDeErro } from '../../shared/utils/erros';
import { ErroCarregarComponent } from '../../shared/components/erro-carregar/erro-carregar';
import { rotuloVeiculo } from '../../shared/utils/placa';
import { CENTRO_CRUZ_MACHADO, SituacaoTrajeto, TrajetoNoMapa, criarMapa, enquadrarPontos } from '../../shared/utils/mapa';
import { LegendaTrajetoComponent } from '../../shared/components/legenda-trajeto/legenda-trajeto';
import { ModalDirective } from '../../shared/directives/modal';
import { ClicavelDirective } from '../../shared/directives/clicavel';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';
import { EstadoDetalheDiario, EstadoVerificacao, ModalDiarioComponent } from '../../shared/components/modal-diario/modal-diario';
import { FotosCache } from '../../shared/services/fotos-cache';

@Component({
  selector: 'app-lancamento-mensal',
  standalone: true,
  imports: [CommonModule, FormsModule, ErroCarregarComponent, ModalDirective, ClicavelDirective, StatusBadgeComponent, ModalDiarioComponent, LegendaTrajetoComponent],
  templateUrl: './lancamento-mensal.html',
  styleUrl: './lancamento-mensal.css',
  // Fotos já baixadas ficam só enquanto esta tela estiver aberta (ao sair, as URLs são liberadas).
  providers: [FotosCache]
})
export class LancamentoMensal implements OnInit, OnDestroy {

  resumos            = signal<DiarioResumoMensal[]>([]);
  diarios            = signal<DiarioResponse[]>([]);
  veiculos           = signal<VeiculoResponse[]>([]);
  carregando         = signal(true);
  carregandoDiarios  = signal(false);
  erroResumos        = signal('');
  erroDiarios        = signal('');
  resumoSelecionado  = signal<DiarioResumoMensal | null>(null);

  filtroVeiculoId = signal('');
  filtroMes       = signal(new Date().getMonth() + 1);
  filtroAno       = signal(new Date().getFullYear());
  buscaVeiculo    = signal('');
  mostrarSugestoes = signal(false);

  diarioSelecionado   = signal<DiarioResponse | null>(null);
  modalMapaAberto     = signal(false);
  carregandoRota      = signal(false);
  modalChecklistAberto = signal(false);
  carregandoChecklist  = signal(false);
  checklistDiario      = signal<ChecklistRespostaResponse[]>([]);
  verificacoes         = signal<Record<string, EstadoVerificacao>>({});
  diarioDetalhe        = signal<DiarioResponse | null>(null);
  detalhes             = signal<Partial<Record<string, EstadoDetalheDiario>>>({});

  private mapaLeaflet?: L.Map;
  // Pontos reais por cima do traçado pelas ruas (OSRM, automático; plano B = linha reta).
  private trajeto = new TrajetoNoMapa({ tamanhoMarco: 16, rotuloFim: 'Fim' });
  quantidadePontos = signal(0);
  situacaoTrajeto = signal<SituacaoTrajeto | null>(null);

  veiculosFiltradosBusca = computed(() => {
    const termo = this.buscaVeiculo().toLowerCase().trim();
    if (!termo) return this.veiculos();
    return this.veiculos().filter(v =>
      v.descricao.toLowerCase().includes(termo) ||
      (v.placa?.toLowerCase().includes(termo) ?? false)
    );
  });

  meses = [
    { valor: 1, label: 'Janeiro' },  { valor: 2, label: 'Fevereiro' },
    { valor: 3, label: 'Março' },    { valor: 4, label: 'Abril' },
    { valor: 5, label: 'Maio' },     { valor: 6, label: 'Junho' },
    { valor: 7, label: 'Julho' },    { valor: 8, label: 'Agosto' },
    { valor: 9, label: 'Setembro' }, { valor: 10, label: 'Outubro' },
    { valor: 11, label: 'Novembro' },{ valor: 12, label: 'Dezembro' }
  ];

  anos = computed(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => anoAtual - i);
  });

  totalPercorrido = computed(() => this.resumos().reduce((acc, r) => acc + r.totalPercorrido, 0));
  totalDiarios    = computed(() => this.resumos().reduce((acc, r) => acc + r.totalDiarios, 0));

  // Tipo do medidor do veículo cujos diários estão na tela (o diário não traz essa informação).
  tipoMedidor = computed(() =>
    this.veiculos().find(v => v.id === this.resumoSelecionado()?.veiculoId)?.tipoMedidor ?? null);

  constructor(
    private abastecimentoService: AbastecimentoService,
    private checklistService: ChecklistService,
    private diarioService: DiarioService,
    private ocorrenciaService: OcorrenciaService,
    private rastreamentoService: RastreamentoService,
    private veiculoService: VeiculoService
  ) {}

  ngOnInit(): void {
    this.veiculoService.listarVeiculos().subscribe({ next: d => this.veiculos.set(d) });
    this.buscar();
  }

  ngOnDestroy(): void {
    this.trajeto.limpar();
    this.mapaLeaflet?.remove();
    this.mapaLeaflet = undefined;
  }

  getNomeMes(mes: number): string { return this.meses.find(m => m.valor === mes)?.label ?? ''; }

  selecionarVeiculo(v: VeiculoResponse): void {
    this.filtroVeiculoId.set(v.id);
    this.buscaVeiculo.set(rotuloVeiculo(v.descricao, v.placa));
    this.mostrarSugestoes.set(false);
  }

  limparVeiculo(): void {
    this.filtroVeiculoId.set('');
    this.buscaVeiculo.set('');
    this.mostrarSugestoes.set(false);
  }

  buscar(): void {
    this.carregando.set(true);
    this.erroResumos.set('');
    this.resumoSelecionado.set(null);
    this.diarioService.listarResumoMensal(
      this.filtroVeiculoId() || undefined,
      this.filtroMes() || undefined,
      this.filtroAno() || undefined
    ).subscribe({
      next: d => { this.resumos.set(d); this.carregando.set(false); },
      error: e => { this.erroResumos.set(mensagemDeErro(e)); this.carregando.set(false); }
    });
  }

  verDiarios(resumo: DiarioResumoMensal): void {
    this.resumoSelecionado.set(resumo);
    this.carregandoDiarios.set(true);
    this.erroDiarios.set('');
    this.diarioService.listarDiarios(resumo.veiculoId, resumo.mes, resumo.ano).subscribe({
      next: d => { this.diarios.set(d); this.carregandoDiarios.set(false); },
      error: e => { this.erroDiarios.set(mensagemDeErro(e)); this.carregandoDiarios.set(false); }
    });
  }

  voltar(): void { this.resumoSelecionado.set(null); this.diarios.set([]); }

  getMedidorUnidade(resumo: DiarioResumoMensal): string {
    return this.veiculos().find(v => v.id === resumo.veiculoId)?.tipoMedidor === 'horimetro' ? 'h' : 'km';
  }

  badgeStatus(status: string): string { return badgeStatusDiario(status); }
  labelStatus(status: string): string { return rotuloStatusDiario(status); }
  labelCurto(status: string): string { return rotuloCurtoStatusDiario(status); }

  // ─── verificação de integridade (só diários assinados, ao abrir o detalhe; nunca ao carregar a lista) ──

  verificar(d: DiarioResponse): void {
    if (d.status !== 'assinado' || this.verificacoes()[d.id]?.tipo === 'carregando') return;
    this.definirVerificacao(d.id, { tipo: 'carregando' });
    this.diarioService.verificarDiario(d.id).subscribe({
      next: r => this.definirVerificacao(d.id, {
        tipo: 'resultado', integro: r.integro, mensagem: r.mensagem, assinadoEm: r.assinadoEm
      }),
      error: erro => this.definirVerificacao(d.id, {
        tipo: 'erro', mensagem: mensagemDeErro(erro)
      })
    });
  }

  private definirVerificacao(id: string, estado: EstadoVerificacao): void {
    this.verificacoes.update(atual => ({ ...atual, [id]: estado }));
  }

  // ─── detalhes do diário (abastecimentos e ocorrências só ao abrir, guardados por diário) ───

  abrirDetalhe(d: DiarioResponse): void {
    this.diarioDetalhe.set(d);
    const atual = this.detalhes()[d.id];
    if (!atual || atual.tipo === 'erro') this.carregarDetalhe(d.id);
    // Diário assinado: a integridade aparece sozinha no modal (guardada como as listas; erro tenta de novo).
    const verificacao = this.verificacoes()[d.id];
    if (!verificacao || verificacao.tipo === 'erro') this.verificar(d);
  }

  carregarDetalhe(id: string): void {
    this.definirDetalhe(id, { tipo: 'carregando' });
    forkJoin({
      abastecimentos: this.abastecimentoService.listarAbastecimentosPorDiario(id),
      ocorrencias: this.ocorrenciaService.listarOcorrenciasPorDiario(id)
    }).subscribe({
      next: r => this.definirDetalhe(id, { tipo: 'pronto', ...r }),
      error: e => this.definirDetalhe(id, { tipo: 'erro', mensagem: mensagemDeErro(e) })
    });
  }

  fecharDetalhe(): void { this.diarioDetalhe.set(null); }

  // Atalhos do modal: fecha o detalhe e abre o modal que já existe (não empilha dois modais).
  verRotaDoDetalhe(d: DiarioResponse): void { this.fecharDetalhe(); this.abrirMapa(d); }
  checklistDoDetalhe(d: DiarioResponse): void { this.fecharDetalhe(); this.abrirChecklist(d); }

  private definirDetalhe(id: string, estado: EstadoDetalheDiario): void {
    this.detalhes.update(atual => ({ ...atual, [id]: estado }));
  }

  // ─── mapa ────────────────────────────────────────────────────────────────

  abrirMapa(d: DiarioResponse, event?: Event): void {
    event?.stopPropagation();
    if (!d.id) return;
    this.diarioSelecionado.set(d);
    this.modalMapaAberto.set(true);
    this.carregandoRota.set(true);
    this.quantidadePontos.set(0);
    this.situacaoTrajeto.set(null);
    this.rastreamentoService.buscarPontosDiario(d.id).subscribe({
      next: pontos => {
        this.carregandoRota.set(false);
        setTimeout(() => this.iniciarMapa(pontos), 300);
      },
      error: () => {
        this.carregandoRota.set(false);
        setTimeout(() => this.iniciarMapa([]), 300);
      }
    });
  }

  fecharMapa(): void {
    this.limparCamadasMapa();
    if (this.mapaLeaflet) { this.mapaLeaflet.remove(); this.mapaLeaflet = undefined; }
    this.modalMapaAberto.set(false);
    this.diarioSelecionado.set(null);
  }

  private async iniciarMapa(pontos: PontoRastreamento[]): Promise<void> {
    const el = document.getElementById('mapa-diario');
    if (!el) return;

    this.limparCamadasMapa();
    if (this.mapaLeaflet) { this.mapaLeaflet.remove(); this.mapaLeaflet = undefined; }

    const centro: [number, number] = pontos.length > 0
      ? [pontos[0].latitude, pontos[0].longitude]
      : CENTRO_CRUZ_MACHADO;

    const mapa = criarMapa('mapa-diario', { zoomControl: true }).setView(centro, 15);
    this.mapaLeaflet = mapa;
    if (pontos.length === 0) return;

    // TODOS os pontos reais; o traçado pelas ruas chega sozinho (enquanto isso, linha reta provisória).
    this.quantidadePontos.set(pontos.length);
    this.situacaoTrajeto.set(pontos.length >= 2 ? 'calculando' : null);
    const desenho = this.trajeto.desenhar(mapa, pontos);
    enquadrarPontos(mapa, pontos);
    const situacao = await desenho;
    if (this.mapaLeaflet === mapa && situacao) this.situacaoTrajeto.set(situacao);
  }

  private limparCamadasMapa(): void {
    this.trajeto.limpar();
  }

  // ─── checklist ───────────────────────────────────────────────────────────

  abrirChecklist(d: DiarioResponse, event?: Event): void {
    event?.stopPropagation();
    if (!d.id) return;
    this.diarioSelecionado.set(d);
    this.modalChecklistAberto.set(true);
    this.carregandoChecklist.set(true);
    this.checklistDiario.set([]);
    this.checklistService.buscarRespostasChecklist(d.id).subscribe({
      next: data => { this.checklistDiario.set(data); this.carregandoChecklist.set(false); },
      error: () => this.carregandoChecklist.set(false)
    });
  }

  fecharChecklist(): void {
    this.modalChecklistAberto.set(false);
    this.checklistDiario.set([]);
  }
}