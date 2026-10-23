import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbastecimentoService } from '../../services/abastecimento';
import { DiarioService } from '../../services/diario';
import { ManutencaoService } from '../../services/manutencao';
import { RastreamentoService } from '../../services/rastreamento';
import { UsuarioService } from '../../services/usuario';
import { VeiculoService } from '../../services/veiculo';
import { AbastecimentoDetalhado } from '../../interfaces/abastecimento';
import { DiarioResponse } from '../../interfaces/diario';
import { ManutencaoResponse } from '../../interfaces/manutencao';
import { PontoRastreamento, UltimaPosicao } from '../../interfaces/rastreamento';
import { MotoristaOnline } from '../../interfaces/usuario';
import { VeiculoEmUso, VeiculoResponse } from '../../interfaces/veiculo';
import { interval, Subscription } from 'rxjs';
import * as L from 'leaflet';
import { criarElemento, fotoBase64Valida } from '../../shared/utils/html';
import { mensagemDeErro } from '../../shared/utils/erros';
import { CENTRO_CRUZ_MACHADO, SituacaoTrajeto, TrajetoNoMapa, criarIconePonto, criarMapa, enquadrarPontos } from '../../shared/utils/mapa';
import { LegendaTrajetoComponent } from '../../shared/components/legenda-trajeto/legenda-trajeto';
import { ModalDirective } from '../../shared/directives/modal';
import { ClicavelDirective } from '../../shared/directives/clicavel';
import { AvatarComponent } from '../../shared/components/avatar/avatar';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';

export interface PosicaoAtual {
  diarioId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  motoristaNome: string;
  motoristaLogin: string;
  latitude: number;
  longitude: number;
  destino: string | null;
  registradoEm: string;
}

const LIMITE_ALERTA_MINUTOS = 20;
const LIMITE_DIARIO_HORAS   = 8;
const ZOOM_INICIAL = 13;
const ZOOM_FOCO    = 16;

// Atualização automática: rápida para o que é "ao vivo"; lenta para abastecimentos.
// Com a aba do navegador oculta, nada é buscado.
const INTERVALO_RAPIDO_MS          = 15_000;
const INTERVALO_ABASTECIMENTOS_MS  = 2 * 60_000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ModalDirective, ClicavelDirective, AvatarComponent, StatusBadgeComponent, LegendaTrajetoComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {

  motoristasOnline = signal<MotoristaOnline[]>([]);
  veiculosEmUso    = signal<VeiculoEmUso[]>([]);
  veiculos         = signal<VeiculoResponse[]>([]);
  manutencoes      = signal<ManutencaoResponse[]>([]);
  posicoes         = signal<PosicaoAtual[]>([]);
  abastecimentos   = signal<AbastecimentoDetalhado[]>([]);

  carregando               = signal(true);
  falhaAtualizacao         = signal('');
  segundosDesdeAtualizacao = signal(0);
  agora                    = signal(Date.now());
  motoristaFocado          = signal<PosicaoAtual | null>(null);
  fotoFocado               = signal<string | null>(null);

  painelAberto      = signal(true);
  diarioSelecionado = signal<DiarioResponse | null>(null);
  carregandoDiario  = signal(false);
  modalAberto       = signal(false);

  private mapa?: L.Map;
  private mapaModal?: L.Map;
  private marcadores         = new Map<string, L.Marker>();
  // Trajeto do motorista focado (mapa principal, ao vivo) e do modal do diário: pontos reais por cima
  // do traçado pelas ruas (OSRM, automático; plano B = linha reta). "Posição atual" = último ponto real.
  private trajetoFoco = new TrajetoNoMapa({ tamanhoMarco: 14, rotuloFim: 'Posição atual' });
  private trajetoModal = new TrajetoNoMapa({ tamanhoMarco: 14, rotuloFim: 'Posição atual' });
  pontosFoco = signal(0);
  situacaoFoco = signal<SituacaoTrajeto | null>(null);
  pontosModal = signal(0);
  situacaoModal = signal<SituacaoTrajeto | null>(null);
  private subscriptionDados?:   Subscription;
  private subscriptionAbastecimentos?: Subscription;
  private subscriptionRelogio?: Subscription;
  private ultimaBuscaAbastecimentos = 0;
  private timerMapa?: ReturnType<typeof setTimeout>;
  private readonly aoMudarVisibilidade = () => this.visibilidadeMudou();

  // ─── computed ────────────────────────────────────────────────────────────

  emRota         = computed(() => this.veiculos().filter(v => v.status === 'em_uso').length);
  disponivel     = computed(() => this.veiculos().filter(v => v.status === 'disponivel').length);
  emManutencao   = computed(() => this.veiculos().filter(v => v.status === 'em_manutencao').length);
  manutencoesAbertas = computed(() => this.manutencoes().filter(m => m.status !== 'concluida').length);

  // Rastreados agora (com posição GPS registrada)
  veiculosRastreados = computed(() => this.posicoes().length);

  // Último abastecimento
  ultimoAbastecimento = computed(() =>
    [...this.abastecimentos()].sort((a, b) =>
      new Date(b.registradoEm ?? 0).getTime() - new Date(a.registradoEm ?? 0).getTime()
    )[0] ?? null
  );

  // Diários abertos há mais de LIMITE_DIARIO_HORAS horas
  diariosAtrasados = computed(() => {
    const agora = this.agora();
    return this.veiculosEmUso().filter(v => {
      if (!v.diarioAbertoEm) return false;
      const horas = (agora - new Date(v.diarioAbertoEm).getTime()) / 3600000;
      return horas >= LIMITE_DIARIO_HORAS;
    });
  });

  alertaCritico = computed<PosicaoAtual | null>(() => {
    const agora = Date.now();
    return this.posicoes().find(p =>
      (agora - new Date(p.registradoEm).getTime()) / 60000 >= LIMITE_ALERTA_MINUTOS
    ) ?? null;
  });

  constructor(
    private abastecimentoService: AbastecimentoService,
    private diarioService: DiarioService,
    private manutencaoService: ManutencaoService,
    private rastreamentoService: RastreamentoService,
    private usuarioService: UsuarioService,
    private veiculoService: VeiculoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarDados();
    this.carregarAbastecimentos();
    if (document.visibilityState !== 'hidden') this.iniciarPolling();
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
    this.subscriptionRelogio = interval(1000).subscribe(() => {
      this.segundosDesdeAtualizacao.update(s => s + 1);
      this.agora.set(Date.now());
    });
    this.timerMapa = setTimeout(() => this.iniciarMapa(), 300);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerMapa); // saiu da tela antes de o mapa ser criado
    this.pararPolling();
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
    this.subscriptionRelogio?.unsubscribe();
    this.trajetoFoco.limpar();
    this.trajetoModal.limpar();
    this.mapa?.remove();
    this.mapaModal?.remove();
  }

  // ─── atualização automática ──────────────────────────────────────────────

  private iniciarPolling(): void {
    this.pararPolling();
    this.subscriptionDados = interval(INTERVALO_RAPIDO_MS).subscribe(() => this.carregarDados());
    this.subscriptionAbastecimentos = interval(INTERVALO_ABASTECIMENTOS_MS).subscribe(() => this.carregarAbastecimentos());
  }

  private pararPolling(): void {
    this.subscriptionDados?.unsubscribe();
    this.subscriptionAbastecimentos?.unsubscribe();
    this.subscriptionDados = undefined;
    this.subscriptionAbastecimentos = undefined;
  }

  // Aba oculta: para de buscar. Aba visível de novo: atualiza na hora e volta ao ritmo normal.
  private visibilidadeMudou(): void {
    if (document.visibilityState === 'hidden') {
      this.pararPolling();
      return;
    }
    this.carregarDados();
    if (Date.now() - this.ultimaBuscaAbastecimentos >= INTERVALO_ABASTECIMENTOS_MS) this.carregarAbastecimentos();
    this.iniciarPolling();
  }

  // ─── dados ───────────────────────────────────────────────────────────────

  private carregarAbastecimentos(): void {
    this.ultimaBuscaAbastecimentos = Date.now();
    this.abastecimentoService.listarAbastecimentos().subscribe({ next: d => this.abastecimentos.set(d) });
  }

  // Dados "ao vivo" (a cada 15 s). A lista completa de diários não é mais buscada aqui:
  // ela só alimentava um total que a tela não mostra.
  carregarDados(): void {
    this.atualizarTrajetoFocado();
    // Falha aqui vira um aviso discreto na tela (o painel tenta de novo a cada 15 s, sem toast).
    this.usuarioService.listarMotoristasOnline().subscribe({
      next: d => {
        this.motoristasOnline.set(d);
        this.carregando.set(false);
        this.falhaAtualizacao.set('');
        this.segundosDesdeAtualizacao.set(0);
      },
      error: e => { this.carregando.set(false); this.falhaAtualizacao.set(mensagemDeErro(e)); }
    });
    this.veiculoService.listarVeiculosEmUso().subscribe({ next: d => this.veiculosEmUso.set(d) });
    this.veiculoService.listarVeiculos().subscribe({ next: d => this.veiculos.set(d) });
    this.manutencaoService.listarManutencoesAbertas().subscribe({ next: d => this.manutencoes.set(d) });
    this.rastreamentoService.listarPosicoesAtuais().subscribe({
      next: data => {
        this.posicoes.set(data
          .filter(p => p.diarioId != null && p.registradoEm != null)
          .map(p => ({
            diarioId: p.diarioId, veiculoDescricao: p.veiculoDescricao ?? '',
            veiculoPlaca: p.veiculoPlaca, motoristaNome: p.nomeCompleto,
            motoristaLogin: p.login, latitude: p.latitude, longitude: p.longitude,
            destino: p.destino, registradoEm: p.registradoEm!
          }))
        );
        this.atualizarMarcadores();
      },
      error: () => {}
    });
  }

  // ─── mapa principal ───────────────────────────────────────────────────────

  private iniciarMapa(): void {
    this.mapa = criarMapa('mapa-frota', { zoomControl: false }).setView(CENTRO_CRUZ_MACHADO, ZOOM_INICIAL);
    L.control.zoom({ position: 'bottomleft' }).addTo(this.mapa);
    this.atualizarMarcadores();
  }

  centralizarMapa(): void {
    if (!this.mapa) return;
    this.mapa.flyTo(CENTRO_CRUZ_MACHADO, ZOOM_INICIAL, { animate: true, duration: 0.8 });
  }

  private atualizarMarcadores(): void {
    if (!this.mapa) return;
    for (const m of this.marcadores.values()) this.mapa.removeLayer(m);
    this.marcadores.clear();

    for (const p of this.posicoes()) {
      const emAlerta = this.alertaCritico()?.diarioId === p.diarioId;
      const focado   = this.motoristaFocado()?.diarioId === p.diarioId;
      const cor      = emAlerta ? '#ef4444' : '#1d4ed8';

      let icone: L.DivIcon;
      if (focado) {
        icone = criarIconePonto(cor, 14);
      } else {
        // Montado via DOM: nome e foto vêm da API e não podem virar HTML.
        const mot   = this.motoristasOnline().find(m => m.login === p.motoristaLogin);
        const caixa = criarElemento('div', '',
          `width:38px;height:38px;border-radius:50%;background:${cor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;`);
        const foto  = mot?.fotoPerfil;
        if (fotoBase64Valida(foto)) {
          const img = criarElemento('img', '', 'width:100%;height:100%;object-fit:cover;border-radius:50%;') as HTMLImageElement;
          img.alt = '';
          // Foto que não carrega: troca pela inicial (mesmo visual de quando não há foto).
          img.onerror = () => img.replaceWith(criarElemento('span', this.getIniciais(p.motoristaNome), 'font-size:12px;font-weight:600;color:#fff;'));
          img.src = 'data:image/jpeg;base64,' + foto;
          caixa.append(img);
        } else {
          caixa.append(criarElemento('span', this.getIniciais(p.motoristaNome), 'font-size:12px;font-weight:600;color:#fff;'));
        }
        icone = L.divIcon({
          className: '',
          html: caixa,
          iconSize: [38, 38], iconAnchor: [19, 19]
        });
      }

      const marcador = L.marker([p.latitude, p.longitude], { icon: icone }).addTo(this.mapa);
      marcador.on('click', () => this.focarMotorista(p));
      this.marcadores.set(p.diarioId, marcador);
    }
  }

  // ─── foco no motorista ────────────────────────────────────────────────────

  focarMotorista(posicao: PosicaoAtual): void {
    if (!this.mapa) return;
    const mot = this.motoristasOnline().find(m => m.login === posicao.motoristaLogin);
    this.fotoFocado.set(mot?.fotoPerfil ?? null);
    this.motoristaFocado.set(posicao);
    this.atualizarMarcadores();
    this.mapa.flyTo([posicao.latitude, posicao.longitude], ZOOM_FOCO, { animate: true, duration: 0.8 });
    this.trajetoFoco.limpar();
    this.pontosFoco.set(0);
    this.situacaoFoco.set(null);
    this.atualizarTrajetoFocado();
  }

  // Ao focar e a cada atualização automática (15 s): busca os pontos do diário focado e só redesenha
  // se chegaram pontos novos. O OSRM é recalculado no máximo a cada 30 s (cache em trajeto.ts).
  private atualizarTrajetoFocado(): void {
    const focado = this.motoristaFocado();
    if (!focado || !this.mapa) return;
    this.rastreamentoService.buscarPontosDiario(focado.diarioId).subscribe({
      next: async pontos => {
        const mapa = this.mapa;
        if (!mapa || this.motoristaFocado()?.diarioId !== focado.diarioId) return;
        if (this.pontosFoco() === 0 && pontos.length >= 2) this.situacaoFoco.set('calculando');
        this.pontosFoco.set(pontos.length);
        const situacao = await this.trajetoFoco.atualizar(mapa, pontos);
        if (situacao && situacao !== 'sem mudança' && this.motoristaFocado()?.diarioId === focado.diarioId) this.situacaoFoco.set(situacao);
      },
      error: () => {}
    });
  }

  voltarParaTodos(): void {
    if (!this.mapa) return;
    this.trajetoFoco.limpar();
    this.pontosFoco.set(0);
    this.situacaoFoco.set(null);
    this.motoristaFocado.set(null);
    this.fotoFocado.set(null);
    this.atualizarMarcadores();
    if (this.marcadores.size > 0) {
      const grupo = L.featureGroup(Array.from(this.marcadores.values()));
      this.mapa.flyToBounds(grupo.getBounds().pad(0.25), { animate: true, duration: 0.8 });
    } else {
      this.mapa.flyTo(CENTRO_CRUZ_MACHADO, ZOOM_INICIAL, { animate: true, duration: 0.8 });
    }
  }

  // ─── modal diário ─────────────────────────────────────────────────────────

  abrirModalDiario(login: string): void {
    this.carregandoDiario.set(true);
    this.modalAberto.set(true);
    this.pontosModal.set(0);
    this.situacaoModal.set(null);
    this.diarioSelecionado.set(null);
    this.diarioService.buscarDiarioAberto(login).subscribe({
      next: diario => {
        this.diarioSelecionado.set(diario);
        this.carregandoDiario.set(false);
        if (diario.id) {
          this.rastreamentoService.buscarPontosDiario(diario.id).subscribe({
            next: pontos => this.iniciarMapaModal(pontos),
            error: () => {}
          });
        }
      },
      error: () => { this.diarioSelecionado.set(null); this.carregandoDiario.set(false); }
    });
  }

  fecharModal(): void {
    this.trajetoModal.limpar();
    if (this.mapaModal) { this.mapaModal.remove(); this.mapaModal = undefined; }
    this.modalAberto.set(false);
    this.diarioSelecionado.set(null);
  }

  private iniciarMapaModal(pontos: PontoRastreamento[]): void {
    const tentar = async (n: number) => {
      const el = document.getElementById('mapa-modal');
      if (!el) { if (n > 0) setTimeout(() => tentar(n - 1), 150); return; }
      if (this.mapaModal) { this.mapaModal.remove(); this.mapaModal = undefined; }
      const centro: [number, number] = pontos.length > 0
        ? [pontos[0].latitude, pontos[0].longitude]
        : CENTRO_CRUZ_MACHADO;
      const mapa = criarMapa('mapa-modal', { zoomControl: true }).setView(centro, ZOOM_INICIAL);
      this.mapaModal = mapa;
      this.pontosModal.set(pontos.length);
      if (pontos.length > 0) {
        this.situacaoModal.set(pontos.length >= 2 ? 'calculando' : null);
        const desenho = this.trajetoModal.desenhar(mapa, pontos);
        enquadrarPontos(mapa, pontos);
        const situacao = await desenho;
        if (this.mapaModal === mapa && situacao) this.situacaoModal.set(situacao);
      }
    };
    setTimeout(() => tentar(10), 200);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  getVeiculoDoMotorista(login: string): VeiculoEmUso | null {
    return this.veiculosEmUso().find(v => v.motoristaLogin === login) ?? null;
  }

  getIniciais(nome: string): string {
    return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getTempoOnline(abertoEm: string | null): string {
    if (!abertoEm) return '';
    const diff = Math.floor((Date.now() - new Date(abertoEm).getTime()) / 60000);
    if (diff < 1) return 'agora';
    const h = Math.floor(diff / 60), m = diff % 60;
    return h > 0 ? `${h}h ${m}min` : `${diff}min`;
  }

  getHorasAberto(abertoEm: string | null): number {
    if (!abertoEm) return 0;
    return Math.floor((this.agora() - new Date(abertoEm).getTime()) / 3600000);
  }

  formatarTempoAtualizacao(): string {
    const s = this.segundosDesdeAtualizacao();
    return s < 60 ? `${s} seg` : `${Math.floor(s / 60)} min`;
  }

  formatarTempoParado(registradoEm: string): string {
    return `${Math.floor((Date.now() - new Date(registradoEm).getTime()) / 60000)} min`;
  }

  irParaManutencao(id: string): void { this.router.navigate(['/manutencao', id]); }
  irParaVeiculos(): void { this.router.navigate(['/veiculos']); }
  togglePainel(): void { this.painelAberto.update(v => !v); }
}