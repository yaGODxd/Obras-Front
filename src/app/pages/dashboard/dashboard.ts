import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  UsuarioService, MotoristaOnline, VeiculoEmUso, DiarioAberto,
  PontoRastreamento, ManutencaoResponse, VeiculoResponse, UltimaPosicao,
  AbastecimentoDetalhado, DiarioResponse
} from '../../services/usuario';
import { interval, Subscription, forkJoin } from 'rxjs';
import * as L from 'leaflet';

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
const CRUZ_MACHADO_LAT = -26.0078;
const CRUZ_MACHADO_LNG = -51.3356;
const ZOOM_INICIAL = 13;
const ZOOM_FOCO    = 16;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
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
  diariosAbertos   = signal<DiarioResponse[]>([]);

  carregando               = signal(true);
  segundosDesdeAtualizacao = signal(0);
  agora                    = signal(Date.now());
  motoristaFocado          = signal<PosicaoAtual | null>(null);
  fotoFocado               = signal<string | null>(null);

  painelAberto      = signal(true);
  diarioSelecionado = signal<DiarioAberto | null>(null);
  carregandoDiario  = signal(false);
  modalAberto       = signal(false);

  private mapa?: L.Map;
  private mapaModal?: L.Map;
  private marcadores         = new Map<string, L.Marker>();
  private camadasTrajeto: any[] = [];
  private subscriptionDados?:   Subscription;
  private subscriptionRelogio?: Subscription;

  // ─── computed ────────────────────────────────────────────────────────────

  emRota         = computed(() => this.veiculos().filter(v => v.status === 'em_uso').length);
  disponivel     = computed(() => this.veiculos().filter(v => v.status === 'disponivel').length);
  emManutencao   = computed(() => this.veiculos().filter(v => v.status === 'manutencao').length);
  manutencoesAbertas = computed(() => this.manutencoes().filter(m => m.status !== 'concluida').length);

  // Rastreados agora (com posição GPS registrada)
  veiculosRastreados = computed(() => this.posicoes().length);

  // Resumo do dia
  kmHoje = computed(() => {
    const hoje = new Date().toDateString();
    return this.diariosAbertos()
      .filter(d => d.abertoEm && new Date(d.abertoEm).toDateString() === hoje)
      .reduce((acc, d) => acc + (d.medidorPercorrido ?? 0), 0);
  });

  abastecimentosHoje = computed(() => {
    const hoje = new Date().toDateString();
    return this.abastecimentos()
      .filter(a => a.registradoEm && new Date(a.registradoEm).toDateString() === hoje)
      .length;
  });

  ocorrenciasAbertas = computed(() => 0); // será implementado quando endpoint disponível

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

  constructor(private usuarioService: UsuarioService, private router: Router) {}

  ngOnInit(): void {
    this.carregarDados();
    this.subscriptionDados   = interval(15000).subscribe(() => this.carregarDados());
    this.subscriptionRelogio = interval(1000).subscribe(() => {
      this.segundosDesdeAtualizacao.update(s => s + 1);
      this.agora.set(Date.now());
    });
    setTimeout(() => this.iniciarMapa(), 300);
  }

  ngOnDestroy(): void {
    this.subscriptionDados?.unsubscribe();
    this.subscriptionRelogio?.unsubscribe();
    this.mapa?.remove();
    this.mapaModal?.remove();
  }

  // ─── dados ───────────────────────────────────────────────────────────────

  carregarDados(): void {
    this.usuarioService.listarMotoristasOnline().subscribe({
      next: d => { this.motoristasOnline.set(d); this.carregando.set(false); },
      error: () => this.carregando.set(false)
    });
    this.usuarioService.listarVeiculosEmUso().subscribe({ next: d => this.veiculosEmUso.set(d) });
    this.usuarioService.listarVeiculos().subscribe({ next: d => this.veiculos.set(d) });
    this.usuarioService.listarManutencoesAbertas().subscribe({ next: d => this.manutencoes.set(d) });
    this.usuarioService.listarAbastecimentos().subscribe({ next: d => this.abastecimentos.set(d) });
    this.usuarioService.listarDiarios().subscribe({ next: d => this.diariosAbertos.set(d) });
    this.usuarioService.listarPosicoesAtuais().subscribe({
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
    this.segundosDesdeAtualizacao.set(0);
  }

  // ─── mapa principal ───────────────────────────────────────────────────────

  private iniciarMapa(): void {
    this.mapa = L.map('mapa-frota', { zoomControl: false })
      .setView([CRUZ_MACHADO_LAT, CRUZ_MACHADO_LNG], ZOOM_INICIAL);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }).addTo(this.mapa);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '' }).addTo(this.mapa);
    L.control.zoom({ position: 'bottomleft' }).addTo(this.mapa);
    this.atualizarMarcadores();
  }

  centralizarMapa(): void {
    if (!this.mapa) return;
    this.mapa.flyTo([CRUZ_MACHADO_LAT, CRUZ_MACHADO_LNG], ZOOM_INICIAL, { animate: true, duration: 0.8 });
  }

  private criarIconePonto(cor: string, tam = 12): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<span style="display:block;width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 0 0 3px ${cor}40;"></span>`,
      iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2]
    });
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
        icone = this.criarIconePonto(cor, 14);
      } else {
        const mot      = this.motoristasOnline().find(m => m.login === p.motoristaLogin);
        const iniciais = this.getIniciais(p.motoristaNome);
        const inner    = mot?.fotoPerfil
          ? `<img src="data:image/jpeg;base64,${mot.fotoPerfil}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
          : `<span style="font-size:12px;font-weight:600;color:#fff;">${iniciais}</span>`;
        icone = L.divIcon({
          className: '',
          html: `<div style="width:38px;height:38px;border-radius:50%;background:${cor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;">${inner}</div>`,
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
    this.usuarioService.buscarPontosDiario(posicao.diarioId).subscribe({
      next: pontos => this.desenharTrajeto(pontos, this.mapa!, this.camadasTrajeto),
      error: () => {}
    });
  }

  voltarParaTodos(): void {
    if (!this.mapa) return;
    this.limparCamadas(this.camadasTrajeto, this.mapa);
    this.motoristaFocado.set(null);
    this.fotoFocado.set(null);
    this.atualizarMarcadores();
    if (this.marcadores.size > 0) {
      const grupo = L.featureGroup(Array.from(this.marcadores.values()));
      this.mapa.flyToBounds(grupo.getBounds().pad(0.25), { animate: true, duration: 0.8 });
    } else {
      this.mapa.flyTo([CRUZ_MACHADO_LAT, CRUZ_MACHADO_LNG], ZOOM_INICIAL, { animate: true, duration: 0.8 });
    }
  }

  // ─── desenhar trajeto ─────────────────────────────────────────────────────

  private async desenharTrajeto(pontos: PontoRastreamento[], mapa: L.Map, camadas: any[]): Promise<void> {
    this.limparCamadas(camadas, mapa);
    if (pontos.length < 1) return;
    for (const p of pontos) {
      const c = L.circleMarker([p.latitude, p.longitude], {
        radius: 4, color: '#1e3a5f', fillColor: '#1d4ed8', fillOpacity: 0.85, weight: 1.5
      }).addTo(mapa);
      camadas.push(c);
    }
    const mInicio = L.marker([pontos[0].latitude, pontos[0].longitude],
      { icon: this.criarIconePonto('#22c55e', 14) }).bindTooltip('Início').addTo(mapa);
    const mFim = L.marker([pontos[pontos.length - 1].latitude, pontos[pontos.length - 1].longitude],
      { icon: this.criarIconePonto('#1e3a5f', 14) }).bindTooltip('Posição atual').addTo(mapa);
    camadas.push(mInicio, mFim);
    if (pontos.length < 2) return;
    try {
      const segmentos = await this.rotaOsrm(pontos);
      for (const seg of segmentos) {
        if (seg.length >= 2) {
          const pl = L.polyline(seg, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(mapa);
          camadas.push(pl);
        }
      }
    } catch {}
  }

  private limparCamadas(camadas: any[], mapa: L.Map): void {
    for (const c of camadas) { try { mapa.removeLayer(c); } catch {} }
    camadas.length = 0;
  }

  // ─── OSRM ────────────────────────────────────────────────────────────────

  private readonly MAX_DIST_SEGMENTO = 150;

  private async rotaOsrm(pontos: PontoRastreamento[]): Promise<L.LatLng[][]> {
    const filtrados = this.filtrarProximos(pontos, 25);
    if (filtrados.length < 2) return [];
    const segmentos: L.LatLng[][] = [];
    let segmentoAtual: L.LatLng[] = [];
    for (let i = 0; i < filtrados.length - 1; i++) {
      const a = filtrados[i], b = filtrados[i + 1];
      const dist = this.distM(a.latitude, a.longitude, b.latitude, b.longitude);
      if (dist > this.MAX_DIST_SEGMENTO) {
        if (segmentoAtual.length >= 2) segmentos.push(segmentoAtual);
        segmentoAtual = []; continue;
      }
      try {
        const coords = `${a.longitude},${a.latitude};${b.longitude},${b.latitude}`;
        const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (data.code !== 'Ok' || !data.routes?.length) continue;
        const trecho = data.routes[0].geometry.coordinates.map((c: [number, number]) => L.latLng(c[1], c[0]));
        if (segmentoAtual.length > 0) trecho.shift();
        segmentoAtual.push(...trecho);
      } catch { continue; }
    }
    if (segmentoAtual.length >= 2) segmentos.push(segmentoAtual);
    return segmentos;
  }

  private filtrarProximos(pontos: PontoRastreamento[], minMetros: number): PontoRastreamento[] {
    if (!pontos.length) return [];
    const res = [pontos[0]];
    for (let i = 1; i < pontos.length; i++) {
      const ant = res[res.length - 1];
      if (this.distM(ant.latitude, ant.longitude, pontos[i].latitude, pontos[i].longitude) >= minMetros)
        res.push(pontos[i]);
    }
    if (res[res.length - 1] !== pontos[pontos.length - 1]) res.push(pontos[pontos.length - 1]);
    return res;
  }

  private distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ─── modal diário ─────────────────────────────────────────────────────────

  private camadasModal: any[] = [];

  abrirModalDiario(login: string): void {
    this.carregandoDiario.set(true);
    this.modalAberto.set(true);
    this.diarioSelecionado.set(null);
    this.usuarioService.buscarDiarioAberto(login).subscribe({
      next: diario => {
        this.diarioSelecionado.set(diario);
        this.carregandoDiario.set(false);
        if (diario.id) {
          this.usuarioService.buscarPontosDiario(diario.id).subscribe({
            next: pontos => this.iniciarMapaModal(pontos),
            error: () => {}
          });
        }
      },
      error: () => { this.diarioSelecionado.set(null); this.carregandoDiario.set(false); }
    });
  }

  fecharModal(): void {
    if (this.mapaModal) {
      this.limparCamadas(this.camadasModal, this.mapaModal);
      this.mapaModal.remove(); this.mapaModal = undefined;
    }
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
        : [CRUZ_MACHADO_LAT, CRUZ_MACHADO_LNG];
      this.mapaModal = L.map('mapa-modal', { zoomControl: true }).setView(centro, ZOOM_INICIAL);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri' }).addTo(this.mapaModal);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { attribution: '' }).addTo(this.mapaModal);
      if (pontos.length > 0) {
        await this.desenharTrajeto(pontos, this.mapaModal, this.camadasModal);
        const bounds = L.latLngBounds(pontos.map(p => L.latLng(p.latitude, p.longitude)));
        this.mapaModal.fitBounds(bounds.pad(0.15));
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

  getTempoEmUso(abertoEm: string | null): string {
    return this.getTempoOnline(abertoEm) || 'recém iniciado';
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

  acionarSuporte(): void {
    alert(`Suporte acionado para: ${this.alertaCritico()?.veiculoDescricao}`);
  }

  irParaManutencao(id: string): void { this.router.navigate(['/manutencao', id]); }
  irParaVeiculos(): void { this.router.navigate(['/veiculos']); }
  togglePainel(): void { this.painelAberto.update(v => !v); }
}