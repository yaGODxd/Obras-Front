import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService, ManutencaoResponse, AtualizarStatusRequest } from '../../../services/usuario';

@Component({
  selector: 'app-manutencao-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './manutencao-detalhe.html',
  styleUrl: './manutencao-detalhe.css'
})
export class ManutencaoDetalhe implements OnInit {

  manutencao = signal<ManutencaoResponse | null>(null);
  carregando = signal(true);
  atualizando = signal(false);
  novoStatus = '';
  novaObservacao = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.usuarioService.buscarManutencao(id).subscribe({
      next: (data) => {
        this.manutencao.set(data);
        this.novoStatus = data.status;
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
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
    this.usuarioService.atualizarStatusManutencao(m.id!, request).subscribe({
      next: (data) => {
        this.manutencao.set(data);
        this.atualizando.set(false);
      },
      error: () => this.atualizando.set(false)
    });
  }

  voltar(): void {
    this.router.navigate(['/manutencao']);
  }

  badgeStatus(status: string): string {
    const map: any = {
      'aberta': 'badge-error',
      'em_andamento': 'badge-warning',
      'concluida': 'badge-success'
    };
    return map[status] ?? 'badge-ghost';
  }

  labelStatus(status: string): string {
    const map: any = {
      'aberta': 'Aberta',
      'em_andamento': 'Em andamento',
      'concluida': 'Concluída'
    };
    return map[status] ?? status;
  }

  badgeTipo(tipo: string): string {
    return tipo === 'preventiva' ? 'badge-info' : 'badge-warning';
  }

  labelTipo(tipo: string): string {
    return tipo === 'preventiva' ? 'Preventiva' : 'Corretiva';
  }
}