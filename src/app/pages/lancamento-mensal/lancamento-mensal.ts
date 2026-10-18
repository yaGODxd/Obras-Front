import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService, DiarioResumoMensal, DiarioResponse, VeiculoResponse, ChecklistRespostaResponse, PontoRastreamento } from '../../services/usuario';
import * as L from 'leaflet';

@Component({
  selector: 'app-lancamento-mensal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lancamento-mensal.html',
  styleUrl: './lancamento-mensal.css'
})
export class LancamentoMensal implements OnInit {

  resumos            = signal<DiarioResumoMensal[]>([]);
  diarios            = signal<DiarioResponse[]>([]);
  veiculos           = signal<VeiculoResponse[]>([]);
  carregando         = signal(true);
  carregandoDiarios  = signal(false);
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

  private mapaLeaflet?: L.Map;
  private camadasMapa: any[] = [];
  private readonly MAX_DIST_SEGMENTO = 400; // metros

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

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.usuarioService.listarVeiculos().subscribe({ next: d => this.veiculos.set(d) });
    this.buscar();
  }

  getNomeMes(mes: number): string { return this.meses.find(m => m.valor === mes)?.label ?? ''; }

  selecionarVeiculo(v: VeiculoResponse): void {
    this.filtroVeiculoId.set(v.id);
    this.buscaVeiculo.set(`${v.descricao}${v.placa ? ' — ' + v.placa : ''}`);
    this.mostrarSugestoes.set(false);
  }

  limparVeiculo(): void {
    this.filtroVeiculoId.set('');
    this.buscaVeiculo.set('');
    this.mostrarSugestoes.set(false);
  }

  buscar(): void {
    this.carregando.set(true);
    this.resumoSelecionado.set(null);
    this.usuarioService.listarResumoMensal(
      this.filtroVeiculoId() || undefined,
      this.filtroMes() || undefined,
      this.filtroAno() || undefined
    ).subscribe({
      next: d => { this.resumos.set(d); this.carregando.set(false); },
      error: () => this.carregando.set(false)
    });
  }

  verDiarios(resumo: DiarioResumoMensal): void {
    this.resumoSelecionado.set(resumo);
    this.carregandoDiarios.set(true);
    this.usuarioService.listarDiarios(resumo.veiculoId, resumo.mes, resumo.ano).subscribe({
      next: d => { this.diarios.set(d); this.carregandoDiarios.set(false); },
      error: () => this.carregandoDiarios.set(false)
    });
  }

  voltar(): void { this.resumoSelecionado.set(null); this.diarios.set([]); }

  getMedidorUnidade(resumo: DiarioResumoMensal): string {
    return this.veiculos().find(v => v.id === resumo.veiculoId)?.tipoMedidor === 'horimetro' ? 'h' : 'km';
  }

  badgeStatus(status: string): string { return status === 'aberto' ? 'badge-warning' : 'badge-success'; }
  labelStatus(status: string): string { return status === 'aberto' ? 'Aberto' : 'Fechado'; }

  // ─── mapa ────────────────────────────────────────────────────────────────

  abrirMapa(d: DiarioResponse, event: Event): void {
    event.stopPropagation();
    if (!d.id) return;
    this.diarioSelecionado.set(d);
    this.modalMapaAberto.set(true);
    this.carregandoRota.set(true);
    this.usuarioService.buscarPontosDiario(d.id).subscribe({
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
      : [-26.0078, -51.3356];

    this.mapaLeaflet = L.map('mapa-diario', { zoomControl: true }).setView(centro, 15);

    // Satélite Esri + labels (igual ao dashboard)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }).addTo(this.mapaLeaflet);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '' }).addTo(this.mapaLeaflet);

    if (pontos.length === 0) return;

    // 1. Bolinhas azuis em cada ponto GPS bruto
    for (const p of pontos) {
      const c = L.circleMarker([p.latitude, p.longitude], {
        radius: 4, color: '#1e3a5f', fillColor: '#1d4ed8', fillOpacity: 0.85, weight: 1.5
      }).bindPopup(p.registradoEm
        ? `<p style="margin:0;font-size:12px">${new Date(p.registradoEm).toLocaleString('pt-BR')}</p>`
        : ''
      ).addTo(this.mapaLeaflet);
      this.camadasMapa.push(c);
    }

    // 2. Marcador início (verde) e fim (azul escuro)
    const mInicio = L.marker([pontos[0].latitude, pontos[0].longitude],
      { icon: this.criarIconePonto('#22c55e', 16) }).bindTooltip('Início').addTo(this.mapaLeaflet);
    const mFim = L.marker([pontos[pontos.length - 1].latitude, pontos[pontos.length - 1].longitude],
      { icon: this.criarIconePonto('#1e3a5f', 16) }).bindTooltip('Fim').addTo(this.mapaLeaflet);
    this.camadasMapa.push(mInicio, mFim);

    // Enquadra todos os pontos
    const bounds = L.latLngBounds(pontos.map(p => L.latLng(p.latitude, p.longitude)));
    this.mapaLeaflet.fitBounds(bounds.pad(0.15));

    if (pontos.length < 2) return;

    // 3. Linha OSRM segmentada — só onde há pontos GPS próximos
    try {
      const segmentos = await this.rotaOsrm(pontos);
      for (const seg of segmentos) {
        if (seg.length >= 2) {
          const pl = L.polyline(seg, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(this.mapaLeaflet);
          this.camadasMapa.push(pl);
        }
      }
    } catch {}
  }

  // ─── OSRM segmento a segmento ─────────────────────────────────────────────

  private async rotaOsrm(pontos: PontoRastreamento[]): Promise<L.LatLng[][]> {
    const filtrados = this.filtrarProximos(pontos, 25);
    if (filtrados.length < 2) return [];

    const segmentos: L.LatLng[][] = [];
    let segmentoAtual: L.LatLng[] = [];

    for (let i = 0; i < filtrados.length - 1; i++) {
      const a = filtrados[i];
      const b = filtrados[i + 1];
      const dist = this.distM(a.latitude, a.longitude, b.latitude, b.longitude);

      if (dist > this.MAX_DIST_SEGMENTO) {
        if (segmentoAtual.length >= 2) segmentos.push(segmentoAtual);
        segmentoAtual = [];
        continue;
      }

      try {
        const coords = `${a.longitude},${a.latitude};${b.longitude},${b.latitude}`;
        const url    = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        const resp   = await fetch(url);
        if (!resp.ok) continue;
        const data   = await resp.json();
        if (data.code !== 'Ok' || !data.routes?.length) continue;

        const trecho = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => L.latLng(c[1], c[0])
        );
        if (segmentoAtual.length > 0) trecho.shift();
        segmentoAtual.push(...trecho);
      } catch { continue; }
    }

    if (segmentoAtual.length >= 2) segmentos.push(segmentoAtual);
    return segmentos;
  }

  // ─── helpers mapa ─────────────────────────────────────────────────────────

  private criarIconePonto(cor: string, tam = 12): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<span style="display:block;width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 0 0 3px ${cor}40;"></span>`,
      iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2]
    });
  }

  private limparCamadasMapa(): void {
    if (!this.mapaLeaflet) return;
    for (const c of this.camadasMapa) { try { this.mapaLeaflet.removeLayer(c); } catch {} }
    this.camadasMapa = [];
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

  // ─── checklist ───────────────────────────────────────────────────────────

  abrirChecklist(d: DiarioResponse, event: Event): void {
    event.stopPropagation();
    if (!d.id) return;
    this.diarioSelecionado.set(d);
    this.modalChecklistAberto.set(true);
    this.carregandoChecklist.set(true);
    this.checklistDiario.set([]);
    this.usuarioService.buscarRespostasChecklist(d.id).subscribe({
      next: data => { this.checklistDiario.set(data); this.carregandoChecklist.set(false); },
      error: () => this.carregandoChecklist.set(false)
    });
  }

  fecharChecklist(): void {
    this.modalChecklistAberto.set(false);
    this.checklistDiario.set([]);
  }
}