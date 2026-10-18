import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { UsuarioService, OcorrenciaDetalhada } from '../../../services/usuario';

@Component({
  selector: 'app-ocorrencia-veiculo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ocorrencia-veiculo.html',
  styleUrl: './ocorrencia-veiculo.css'
})
export class OcorrenciaVeiculoComponent implements OnInit {

  veiculoId = '';
  ocorrencias = signal<OcorrenciaDetalhada[]>([]);
  carregando = signal(true);
  selecionada = signal<OcorrenciaDetalhada | null>(null);
  busca = signal('');
  mapaIniciado = false;
  private mapaLeaflet: any = null;

  ocorrenciasFiltradas = computed(() => {
    const termo = this.busca().toLowerCase();
    if (!termo) return this.ocorrencias();
    return this.ocorrencias().filter(o =>
      o.tipo.toLowerCase().includes(termo) ||
      o.descricao.toLowerCase().includes(termo) ||
      o.motoristaNome.toLowerCase().includes(termo)
    );
  });

  totalOcorrencias = computed(() => this.ocorrencias().length);
  comLocalizacao = computed(() => this.ocorrencias().filter(o => o.latitude && o.longitude).length);
  nomeVeiculo = computed(() => this.ocorrencias().length > 0 ? this.ocorrencias()[0].veiculoDescricao : '');
  placaVeiculo = computed(() => this.ocorrencias().length > 0 ? this.ocorrencias()[0].veiculoPlaca : null);

  tiposOcorrencia = computed(() => {
    const tipos = new Set(this.ocorrencias().map(o => o.tipo));
    return Array.from(tipos).sort();
  });

  constructor(private route: ActivatedRoute, private router: Router, private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.veiculoId = this.route.snapshot.paramMap.get('id') ?? '';
    this.usuarioService.listarOcorrenciasPorVeiculo(this.veiculoId).subscribe({
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
    if (this.mapaLeaflet) { this.mapaLeaflet.remove(); this.mapaLeaflet = null; }
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

  voltar(): void { this.router.navigate(['/ocorrencias']); }

  getCorTipo(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('acidente')) return 'badge-error';
    if (t.includes('pane')) return 'badge-warning';
    if (t.includes('pneu')) return 'badge-info';
    return 'badge-neutral';
  }

  getCountPorTipo(tipo: string): number {
    return this.ocorrencias().filter(o => o.tipo === tipo).length;
  }
}