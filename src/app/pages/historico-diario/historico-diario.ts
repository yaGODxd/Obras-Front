import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService, PontoRastreamento } from '../../services/usuario';
import * as L from 'leaflet';

@Component({
  selector: 'app-historico-diario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historico-diario.html',
  styleUrl: './historico-diario.css'
})
export class HistoricoDiarioComponent {

  diarioId   = '';
  carregando = signal(false);
  erro       = signal('');
  totalPontos = signal(0);

  private mapa?: L.Map;
  private camadas: any[] = [];

  // Distância máxima entre dois pontos para rotear — acima disso não desenha linha
  private readonly MAX_DIST_SEGMENTO = 400; // metros

  constructor(private usuarioService: UsuarioService) {}

  buscar(): void {
    if (!this.diarioId.trim()) { this.erro.set('Informe o ID do diário!'); return; }
    this.erro.set('');
    this.carregando.set(true);

    this.usuarioService.buscarPontosDiario(this.diarioId.trim()).subscribe({
      next: (pontos) => {
        this.totalPontos.set(pontos.length);
        this.carregando.set(false);
        if (pontos.length === 0) {
          this.erro.set('Nenhum ponto de rastreamento encontrado para este diário.');
          return;
        }
        setTimeout(() => this.renderizarMapa(pontos), 150);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Erro ao buscar dados. Verifique o ID informado.');
      }
    });
  }

  private async renderizarMapa(pontos: PontoRastreamento[]): Promise<void> {
    // Reinicia o mapa se já existia
    if (this.mapa) {
      this.limparCamadas();
      this.mapa.remove();
      this.mapa = undefined;
    }

    this.mapa = L.map('mapa-historico', { zoomControl: true })
      .setView([pontos[0].latitude, pontos[0].longitude], 15);

    // Satélite Esri + labels (igual ao dashboard)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri'
    }).addTo(this.mapa);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: ''
    }).addTo(this.mapa);

    // 1. Bolinhas em cada ponto GPS bruto
    for (const p of pontos) {
      const c = L.circleMarker([p.latitude, p.longitude], {
        radius: 4, color: '#1e3a5f', fillColor: '#1d4ed8', fillOpacity: 0.85, weight: 1.5
      }).bindPopup(`
        <div style="min-width:160px">
          <p style="margin:0 0 4px;font-weight:bold;font-size:12px">
            ${p.registradoEm ? new Date(p.registradoEm).toLocaleString('pt-BR') : '—'}
          </p>
          ${p.velocidade !== null ? `<p style="margin:0;font-size:11px;color:#555">Velocidade: ${p.velocidade?.toFixed(1)} km/h</p>` : ''}
        </div>
      `).addTo(this.mapa);
      this.camadas.push(c);
    }

    // 2. Marcador início (verde) e fim (azul escuro)
    const mInicio = L.marker([pontos[0].latitude, pontos[0].longitude], {
      icon: this.criarIconePonto('#22c55e', 16)
    }).bindTooltip('Início').addTo(this.mapa);
    const mFim = L.marker([pontos[pontos.length - 1].latitude, pontos[pontos.length - 1].longitude], {
      icon: this.criarIconePonto('#1e3a5f', 16)
    }).bindTooltip('Fim').addTo(this.mapa);
    this.camadas.push(mInicio, mFim);

    // Enquadra todos os pontos
    const bounds = L.latLngBounds(pontos.map(p => L.latLng(p.latitude, p.longitude)));
    this.mapa.fitBounds(bounds.pad(0.15));

    if (pontos.length < 2) return;

    // 3. Linha OSRM segmentada (só onde há pontos GPS próximos)
    try {
      const segmentos = await this.rotaOsrm(pontos);
      for (const seg of segmentos) {
        if (seg.length >= 2) {
          const pl = L.polyline(seg, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(this.mapa);
          this.camadas.push(pl);
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

  // ─── helpers ─────────────────────────────────────────────────────────────

  private criarIconePonto(cor: string, tam = 12): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<span style="display:block;width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 0 0 3px ${cor}40;"></span>`,
      iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2]
    });
  }

  private limparCamadas(): void {
    if (!this.mapa) return;
    for (const c of this.camadas) { try { this.mapa.removeLayer(c); } catch {} }
    this.camadas = [];
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
}