import { AfterViewInit, Component, ElementRef, OnDestroy, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { OcorrenciaDetalhada, StatusOcorrencia } from '../../../interfaces/ocorrencia';
import { OcorrenciaService } from '../../../services/ocorrencia';
import { AvisosService } from '../../services/avisos';
import { ModalDirective } from '../../directives/modal';
import { criarMapaOcorrencia } from '../../utils/mapa';
import { badgeStatusOcorrencia, badgeTipoOcorrencia, rotuloStatusOcorrencia, statusDaOcorrencia } from '../../utils/ocorrencias';
import { StatusBadgeComponent } from '../status-badge/status-badge';
import { SeloHorarioSuspeitoComponent } from '../selo-horario-suspeito/selo-horario-suspeito';

// Modal "Detalhes da Ocorrência", com o mapa do local quando há GPS. O mapa é criado e destruído aqui.
// A troca manual de status é feita aqui (PUT); a tela que abriu recebe a ocorrência atualizada em (statusAlterado).
@Component({
  selector: 'app-modal-ocorrencia',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDirective, StatusBadgeComponent, SeloHorarioSuspeitoComponent],
  templateUrl: './modal-ocorrencia.html'
})
export class ModalOcorrenciaComponent implements AfterViewInit, OnDestroy {
  ocorrencia = input.required<OcorrenciaDetalhada>();
  // Na tela de um motorista não precisa repetir o motorista (e na de um veículo, o veículo).
  mostrarMotorista = input(true);
  mostrarVeiculo = input(true);
  fechar = output<void>();
  statusAlterado = output<OcorrenciaDetalhada>();

  readonly opcoesStatus: StatusOcorrencia[] = ['pendente', 'em_andamento', 'resolvida'];
  statusAtual = linkedSignal(() => statusDaOcorrencia(this.ocorrencia()));
  statusEscolhido = linkedSignal(() => this.statusAtual());
  salvandoStatus = signal(false);

  private containerMapa = viewChild<ElementRef<HTMLElement>>('mapa');
  private mapa: L.Map | null = null;
  private timerMapa?: ReturnType<typeof setTimeout>;

  badgeTipoOcorrencia = badgeTipoOcorrencia;
  badgeStatus = badgeStatusOcorrencia;
  rotuloStatus = rotuloStatusOcorrencia;

  constructor(private ocorrenciaService: OcorrenciaService, private avisos: AvisosService) {}

  salvarStatus(): void {
    const o = this.ocorrencia();
    const status = this.statusEscolhido();
    if (status === this.statusAtual()) return;
    this.salvandoStatus.set(true);
    this.ocorrenciaService.alterarStatus(o.id, status).subscribe({
      next: () => {
        this.salvandoStatus.set(false);
        this.statusAtual.set(status);
        this.avisos.sucesso('Status da ocorrência atualizado.');
        // resolvidaEm aproximado (a hora certa vem da API ao recarregar a lista).
        this.statusAlterado.emit({ ...o, status, resolvidaEm: status === 'resolvida' ? new Date().toISOString() : null });
      },
      error: (e) => { this.salvandoStatus.set(false); this.avisos.erroHttp(e); }
    });
  }

  // Espera o modal abrir (300 ms) para o Leaflet medir o tamanho certo.
  ngAfterViewInit(): void {
    const o = this.ocorrencia();
    if (!o.latitude || !o.longitude) return;
    this.timerMapa = setTimeout(() => {
      const el = this.containerMapa()?.nativeElement;
      if (el) this.mapa = criarMapaOcorrencia(el, o.latitude!, o.longitude!);
    }, 300);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timerMapa);
    this.mapa?.remove();
    this.mapa = null;
  }
}
