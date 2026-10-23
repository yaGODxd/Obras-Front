import { Component, OnInit, signal, computed, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VeiculoService } from '../../services/veiculo';
import { VeiculoResponse } from '../../interfaces/veiculo';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PaginacaoComponent } from '../../shared/components/paginacao/paginacao';
import { ErroCarregarComponent } from '../../shared/components/erro-carregar/erro-carregar';
import { mensagemDeErro } from '../../shared/utils/erros';
import { STATUS_VEICULO, badgeStatusVeiculo, rotuloStatusVeiculo } from '../../shared/utils/veiculos';
import { ClicavelDirective } from '../../shared/directives/clicavel';
import { formatarMedidor } from '../../shared/utils/formatos';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent, ErroCarregarComponent, ClicavelDirective, StatusBadgeComponent],
  templateUrl: './veiculos.html',
  styleUrl: './veiculos.css'
})
export class Veiculos implements OnInit {

  veiculos = signal<VeiculoResponse[]>([]);
  carregando = signal(true);
  erroCarregar = signal('');
  busca = signal('');
  filtroStatus = signal('');

  veiculosFiltrados = computed(() => {
    let lista = this.veiculos();
    const termo = this.busca().toLowerCase();
    if (termo) {
      lista = lista.filter(v =>
        v.descricao.toLowerCase().includes(termo) ||
        (v.placa?.toLowerCase().includes(termo) ?? false) ||
        v.tipoNome.toLowerCase().includes(termo)
      );
    }
    if (this.filtroStatus()) {
      lista = lista.filter(v => v.status === this.filtroStatus());
    }
    return lista;
  });

  constructor(
    private router: Router,
    private veiculoService: VeiculoService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erroCarregar.set('');
    this.veiculoService.listarVeiculos().subscribe({
      next: (data) => {
        this.veiculos.set(data);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erroCarregar.set(mensagemDeErro(e));
        this.carregando.set(false);
      }
    });
  }

  limparFiltros() {
    this.paginaAtual.set(1);
    this.busca.set('');
    this.filtroStatus.set('');
  }

  verDetalhe(id: string) {
    this.router.navigate(['/veiculos', id]);
  }

  readonly statusVeiculo = STATUS_VEICULO;

  badgeStatus(status: string): string {
    return badgeStatusVeiculo(status);
  }

  labelStatus(status: string): string {
    return rotuloStatusVeiculo(status);
  }

  getMedidor(v: VeiculoResponse): string {
    return formatarMedidor(v.medidorAtual, v.tipoMedidor);
  }

  getSvgVeiculo(tipoNome: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getSvgString(tipoNome));
  }

  private getSvgString(tipoNome: string): string {
    const t = tipoNome.toLowerCase();

    if (t.includes('maquinário') || t.includes('maquinario') || t.includes('pesado')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32">
        <rect x="2" y="32" width="60" height="20" rx="3" fill="#F59E0B"/>
        <rect x="2" y="28" width="28" height="8" rx="2" fill="#D97706"/>
        <rect x="8" y="20" width="16" height="12" rx="2" fill="#FBBF24"/>
        <rect x="10" y="22" width="12" height="8" rx="1" fill="#93C5FD"/>
        <circle cx="14" cy="54" r="8" fill="#1F2937"/>
        <circle cx="14" cy="54" r="4" fill="#6B7280"/>
        <circle cx="50" cy="54" r="8" fill="#1F2937"/>
        <circle cx="50" cy="54" r="4" fill="#6B7280"/>
        <rect x="30" y="24" width="32" height="4" rx="2" fill="#D97706"/>
        <rect x="56" y="16" width="4" height="12" rx="1" fill="#D97706"/>
      </svg>`;
    }

    if (t.includes('caminhão') || t.includes('caminhao')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32">
        <rect x="2" y="28" width="40" height="22" rx="3" fill="#3B82F6"/>
        <rect x="2" y="20" width="20" height="12" rx="2" fill="#2563EB"/>
        <rect x="4" y="22" width="16" height="8" rx="1" fill="#93C5FD"/>
        <rect x="42" y="34" width="20" height="16" rx="2" fill="#1D4ED8"/>
        <circle cx="14" cy="52" r="8" fill="#1F2937"/>
        <circle cx="14" cy="52" r="4" fill="#6B7280"/>
        <circle cx="52" cy="52" r="8" fill="#1F2937"/>
        <circle cx="52" cy="52" r="4" fill="#6B7280"/>
        <rect x="2" y="36" width="60" height="4" rx="1" fill="#1D4ED8"/>
        <rect x="22" y="24" width="4" height="4" rx="1" fill="#FCD34D"/>
        <rect x="56" y="34" width="4" height="4" rx="1" fill="#FCD34D"/>
      </svg>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32">
      <rect x="4" y="32" width="56" height="18" rx="4" fill="#10B981"/>
      <path d="M10 32 L16 18 L48 18 L54 32 Z" fill="#059669"/>
      <rect x="18" y="20" width="12" height="10" rx="1" fill="#A7F3D0"/>
      <rect x="34" y="20" width="12" height="10" rx="1" fill="#A7F3D0"/>
      <circle cx="16" cy="52" r="8" fill="#1F2937"/>
      <circle cx="16" cy="52" r="4" fill="#6B7280"/>
      <circle cx="48" cy="52" r="8" fill="#1F2937"/>
      <circle cx="48" cy="52" r="4" fill="#6B7280"/>
      <rect x="4" y="36" width="4" height="6" rx="1" fill="#FCD34D"/>
      <rect x="56" y="36" width="4" height="6" rx="1" fill="#EF4444"/>
    </svg>`;
  }

  // Volta para a página 1 sempre que a busca ou um filtro muda.
  paginaAtual = linkedSignal({
    source: () => [this.busca(), this.filtroStatus()],
    computation: () => 1
  });
readonly porPagina = 10;

veiculosPaginados = computed(() => {
  const inicio = (this.paginaAtual() - 1) * this.porPagina;
  return this.veiculosFiltrados().slice(inicio, inicio + this.porPagina);
});

mudarPagina(p: number): void {
  this.paginaAtual.set(p);
}
}