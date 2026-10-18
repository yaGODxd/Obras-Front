import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { UsuarioService, OcorrenciaDetalhada } from '../../../services/usuario';
import { PaginacaoComponent } from '../../../shared/components/paginacao/paginacao';

@Component({
  selector: 'app-ocorrencias',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent],
  templateUrl: './ocorrencias.html',
  styleUrl: './ocorrencias.css'
})
export class Ocorrencias implements OnInit {

  ocorrencias = signal<OcorrenciaDetalhada[]>([]);
  carregando = signal(true);
  selecionada = signal<OcorrenciaDetalhada | null>(null);
  busca = signal('');
  filtroTipo = signal('');
  filtroInicio = signal('');
  filtroFim = signal('');
  mapaIniciado = false;
  private mapaLeaflet: any = null;
  private marcador: any = null;

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
    if (this.filtroInicio()) {
      const inicio = new Date(this.filtroInicio());
      lista = lista.filter(o => o.registradoEm && new Date(o.registradoEm) >= inicio);
    }
    if (this.filtroFim()) {
      const fim = new Date(this.filtroFim());
      fim.setHours(23, 59, 59);
      lista = lista.filter(o => o.registradoEm && new Date(o.registradoEm) <= fim);
    }
    return lista;
  });

  totalOcorrencias = computed(() => this.ocorrenciasFiltradas().length);
  comLocalizacao = computed(() => this.ocorrenciasFiltradas().filter(o => o.latitude && o.longitude).length);

  constructor(private usuarioService: UsuarioService, private router: Router) {}

  ngOnInit(): void {
    this.usuarioService.listarOcorrencias().subscribe({
      next: d => { this.ocorrencias.set(d); this.carregando.set(false); },
      error: () => this.carregando.set(false)
    });
  }

  abrirModal(o: OcorrenciaDetalhada): void {
    this.selecionada.set(o);
    this.mapaIniciado = false;
    if (o.latitude && o.longitude) {
      setTimeout(() => this.iniciarMapa(o.latitude!, o.longitude!), 300);
    }
  }

  fecharModal(): void {
    this.selecionada.set(null);
    if (this.mapaLeaflet) { this.mapaLeaflet.remove(); this.mapaLeaflet = null; this.marcador = null; }
  }

  private iniciarMapa(lat: number, lng: number): void {
    if (this.mapaIniciado) return;
    this.mapaIniciado = true;

    const container = document.getElementById('mapa-ocorrencia');
    if (!container) return;

    if (this.mapaLeaflet) { this.mapaLeaflet.remove(); this.mapaLeaflet = null; }

    this.mapaLeaflet = L.map(container).setView([lat, lng], 16);

    // Satélite Esri + labels (igual ao dashboard)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }).addTo(this.mapaLeaflet);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '' }).addTo(this.mapaLeaflet);

    // Marcador vermelho no local da ocorrência
    const icone = L.divIcon({
      className: '',
      html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 3px #ef444440;"></span>`,
      iconSize: [16, 16], iconAnchor: [8, 8]
    });

    L.marker([lat, lng], { icon: icone })
      .bindPopup('Local da ocorrência')
      .openPopup()
      .addTo(this.mapaLeaflet);
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
    this.filtroInicio.set('');
    this.filtroFim.set('');
  }

  getCorTipo(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('acidente')) return 'badge-error';
    if (t.includes('pane')) return 'badge-warning';
    if (t.includes('pneu')) return 'badge-info';
    if (t.includes('combustível') || t.includes('combustivel')) return 'badge-warning';
    return 'badge-neutral';
  }

  paginaAtual = signal(1);
  readonly porPagina = 10;

  ocorrenciasPaginadas = computed(() => {
    const inicio = (this.paginaAtual() - 1) * this.porPagina;
    return this.ocorrenciasFiltradas().slice(inicio, inicio + this.porPagina);
  });

  mudarPagina(p: number): void { this.paginaAtual.set(p); }
}