import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OcorrenciaService } from '../../../services/ocorrencia';
import { OcorrenciaDetalhada } from '../../../interfaces/ocorrencia';
import { ErroCarregarComponent } from '../../../shared/components/erro-carregar/erro-carregar';
import { ModalOcorrenciaComponent } from '../../../shared/components/modal-ocorrencia/modal-ocorrencia';
import { mensagemDeErro } from '../../../shared/utils/erros';
import { badgeStatusOcorrencia, badgeTipoOcorrencia, rotuloStatusOcorrencia, statusDaOcorrencia } from '../../../shared/utils/ocorrencias';
import { ClicavelDirective } from '../../../shared/directives/clicavel';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { SeloHorarioSuspeitoComponent } from '../../../shared/components/selo-horario-suspeito/selo-horario-suspeito';

// A mesma tela serve às rotas /ocorrencias/motorista/:login e /ocorrencias/veiculo/:id (data.por).
export type OcorrenciasPor = 'motorista' | 'veiculo';

@Component({
  selector: 'app-ocorrencias-de',
  standalone: true,
  imports: [CommonModule, FormsModule, ErroCarregarComponent, ModalOcorrenciaComponent, ClicavelDirective, StatusBadgeComponent, SeloHorarioSuspeitoComponent],
  templateUrl: './ocorrencias-de.html'
})
export class OcorrenciasDeComponent implements OnInit {

  por: OcorrenciasPor = 'motorista';
  // Login do motorista ou id do veículo, conforme "por".
  chave = '';
  ocorrencias = signal<OcorrenciaDetalhada[]>([]);
  carregando = signal(true);
  erroCarregar = signal('');
  selecionada = signal<OcorrenciaDetalhada | null>(null);
  busca = signal('');

  ocorrenciasFiltradas = computed(() => {
    const termo = this.busca().toLowerCase();
    if (!termo) return this.ocorrencias();
    return this.ocorrencias().filter(o =>
      o.tipo.toLowerCase().includes(termo) ||
      o.descricao.toLowerCase().includes(termo) ||
      (this.por === 'motorista'
        ? o.veiculoDescricao.toLowerCase().includes(termo) || (o.veiculoPlaca?.toLowerCase().includes(termo) ?? false)
        : o.motoristaNome.toLowerCase().includes(termo))
    );
  });

  totalOcorrencias = computed(() => this.ocorrencias().length);
  comLocalizacao = computed(() => this.ocorrencias().filter(o => o.latitude && o.longitude).length);

  tiposOcorrencia = computed(() => {
    const tipos = new Set(this.ocorrencias().map(o => o.tipo));
    return Array.from(tipos).sort();
  });

  // Nome do motorista ou do veículo, tirado do primeiro registro.
  nomeMotorista = computed(() => this.ocorrencias()[0]?.motoristaNome ?? this.chave);
  nomeVeiculo = computed(() => this.ocorrencias()[0]?.veiculoDescricao ?? '');
  placaVeiculo = computed(() => this.ocorrencias()[0]?.veiculoPlaca ?? null);

  badgeTipoOcorrencia = badgeTipoOcorrencia;
  badgeStatus = badgeStatusOcorrencia;
  rotuloStatus = rotuloStatusOcorrencia;
  status = statusDaOcorrencia;

  constructor(private route: ActivatedRoute, private router: Router, private ocorrenciaService: OcorrenciaService) {}

  ngOnInit(): void {
    const snap = this.route.snapshot;
    this.por = snap.data['por'] === 'veiculo' ? 'veiculo' : 'motorista';
    this.chave = snap.paramMap.get(this.por === 'veiculo' ? 'id' : 'login') ?? '';
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erroCarregar.set('');
    const pedido = this.por === 'veiculo'
      ? this.ocorrenciaService.listarOcorrenciasPorVeiculo(this.chave)
      : this.ocorrenciaService.listarOcorrenciasPorMotorista(this.chave);
    pedido.subscribe({
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

  voltar(): void { this.router.navigate(['/ocorrencias']); }

  getCountPorTipo(tipo: string): number {
    return this.ocorrencias().filter(o => o.tipo === tipo).length;
  }
}
