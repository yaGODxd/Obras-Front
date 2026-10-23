import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ManutencaoService } from '../../../services/manutencao';
import { AtualizarStatusRequest, ManutencaoResponse, PecaRequest, PecaResponse, StatusManutencao } from '../../../interfaces/manutencao';
import { AvisosService } from '../../../shared/services/avisos';
import { badgeStatusManutencao, badgeTipoManutencao, rotuloStatusManutencao, rotuloTipoManutencao } from '../../../shared/utils/manutencoes';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { ModalDirective } from '../../../shared/directives/modal';
import { totalDaPeca, validarPeca } from '../../../shared/utils/pecas';

@Component({
  selector: 'app-manutencao-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, ModalDirective],
  templateUrl: './manutencao-detalhe.html',
  styleUrl: './manutencao-detalhe.css'
})
export class ManutencaoDetalhe implements OnInit {

  manutencao = signal<ManutencaoResponse | null>(null);
  carregando = signal(true);
  atualizando = signal(false);
  novoStatus: StatusManutencao | '' = '';
  novaObservacao = '';

  // Editar peça já gravada (PUT /manutencoes/pecas/{id}). Manutenção concluída não deixa (a API responde 409).
  concluida = computed(() => this.manutencao()?.status === 'concluida');
  pecaEditando = signal<PecaResponse | null>(null);
  formPeca: PecaRequest = { nomePeca: '', codigoPeca: null, marcaPeca: null, quantidade: 1, valorUnitario: 0 };
  salvandoPeca = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private manutencaoService: ManutencaoService,
    private avisos: AvisosService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.manutencaoService.buscarManutencao(id).subscribe({
      next: (data) => {
        this.manutencao.set(data);
        this.novoStatus = data.status;
        this.carregando.set(false);
      },
      error: (e) => {
        this.carregando.set(false);
        this.avisos.erroHttp(e);
        this.router.navigate(['/manutencao']);
      }
    });
  }

  atualizarStatus(): void {
    const m = this.manutencao();
    if (!m || !this.novoStatus) return;
    this.atualizando.set(true);
    const request: AtualizarStatusRequest = {
      status: this.novoStatus,
      observacoes: this.novaObservacao || null
    };
    this.manutencaoService.atualizarStatusManutencao(m.id!, request).subscribe({
      next: (data) => {
        this.manutencao.set(data);
        this.atualizando.set(false);
        this.avisos.sucesso('Status atualizado.');
      },
      error: (e) => {
        this.atualizando.set(false);
        this.avisos.erroHttp(e);
      }
    });
  }

  abrirEdicaoPeca(p: PecaResponse): void {
    if (this.concluida()) return;
    this.formPeca = { nomePeca: p.nomePeca, codigoPeca: p.codigoPeca, marcaPeca: p.marcaPeca, quantidade: p.quantidade, valorUnitario: p.valorUnitario };
    this.pecaEditando.set(p);
  }

  fecharEdicaoPeca(): void { this.pecaEditando.set(null); }

  totalFormPeca(): number { return totalDaPeca(this.formPeca); }

  salvarPeca(): void {
    const peca = this.pecaEditando();
    if (!peca) return;
    const erro = validarPeca(this.formPeca);
    if (erro) { this.avisos.erro(erro); return; }
    const f = this.formPeca;
    const request: PecaRequest = {
      nomePeca: f.nomePeca.trim(), codigoPeca: f.codigoPeca?.trim() || null, marcaPeca: f.marcaPeca?.trim() || null,
      quantidade: f.quantidade, valorUnitario: f.valorUnitario,
    };
    this.salvandoPeca.set(true);
    this.manutencaoService.editarPeca(peca.id, request).subscribe({
      next: () => {
        this.salvandoPeca.set(false);
        this.fecharEdicaoPeca();
        this.avisos.sucesso('Peça atualizada.');
        this.recarregar();
      },
      error: (e) => {
        this.salvandoPeca.set(false);
        this.avisos.erroHttp(e);
        // 409 = a manutenção foi concluída (talvez em outra aba): fecha e mostra o estado atual.
        if (e instanceof HttpErrorResponse && e.status === 409) { this.fecharEdicaoPeca(); this.recarregar(); }
      }
    });
  }

  // Busca de novo para os totais (custoPecas, custoTotal) virem da API.
  private recarregar(): void {
    const m = this.manutencao();
    if (!m) return;
    this.manutencaoService.buscarManutencao(m.id).subscribe({
      next: (data) => this.manutencao.set(data),
      error: (e) => this.avisos.erroHttp(e)
    });
  }

  voltar(): void {
    this.router.navigate(['/manutencao']);
  }

  badgeStatus(status: string): string { return badgeStatusManutencao(status); }
  labelStatus(status: string): string { return rotuloStatusManutencao(status); }
  badgeTipo(tipo: string): string { return badgeTipoManutencao(tipo); }
  labelTipo(tipo: string): string { return rotuloTipoManutencao(tipo); }
}