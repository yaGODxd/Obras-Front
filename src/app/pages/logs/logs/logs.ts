import { Component, OnInit, signal, computed, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogService } from '../../../services/log';
import { LogResponse } from '../../../interfaces/log';
import { PaginacaoComponent } from '../../../shared/components/paginacao/paginacao';
import { ErroCarregarComponent } from '../../../shared/components/erro-carregar/erro-carregar';
import { mensagemDeErro } from '../../../shared/utils/erros';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent, ErroCarregarComponent, AvatarComponent, StatusBadgeComponent],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class LogsComponent implements OnInit {

  logs = signal<LogResponse[]>([]);
  carregando = signal(true);
  erroCarregar = signal('');
  busca = signal('');
  filtroAcao = signal('');
  filtroInicio = signal('');
  filtroFim = signal('');

  acoes = [
    'LOGIN',
    'CADASTRO',
    'ATUALIZAR_PERFIL',
    'ABRIR_DIARIO',
    'FECHAR_DIARIO',
    'ABASTECIMENTO',
    'OCORRENCIA',
    'MANUTENCAO_ABERTA',
    'MANUTENCAO_STATUS'
  ];

  logsFiltrados = computed(() => {
    let lista = this.logs();
    const termo = this.busca().toLowerCase();
    if (termo) {
      lista = lista.filter(l =>
        l.usuarioLogin.toLowerCase().includes(termo) ||
        (l.usuarioNome?.toLowerCase().includes(termo) ?? false) ||
        l.descricao.toLowerCase().includes(termo) ||
        l.acao.toLowerCase().includes(termo)
      );
    }
    if (this.filtroAcao()) {
      lista = lista.filter(l => l.acao === this.filtroAcao());
    }
    return lista;
  });

  constructor(private logService: LogService) {}

  ngOnInit(): void {
    this.carregarLogs();
  }

  carregarLogs(): void {
    this.carregando.set(true);
    this.erroCarregar.set('');
    this.logService.listarLogs(
      undefined,
      undefined,
      this.filtroInicio() || undefined,
      this.filtroFim() || undefined
    ).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erroCarregar.set(mensagemDeErro(e));
        this.carregando.set(false);
      }
    });
  }

  aplicarFiltros(): void {
    this.carregarLogs();
  }

  limparFiltros(): void {
    this.paginaAtual.set(1);
    this.busca.set('');
    this.filtroAcao.set('');
    this.filtroInicio.set('');
    this.filtroFim.set('');
    this.carregarLogs();
  }

  getCorAcao(acao: string): string {
    const map: Record<string, string> = {
      'LOGIN': 'badge-success',
      'CADASTRO': 'badge-info',
      'ATUALIZAR_PERFIL': 'badge-info',
      'ABRIR_DIARIO': 'badge-primary',
      'FECHAR_DIARIO': 'badge-neutral',
      'ABASTECIMENTO': 'badge-warning',
      'OCORRENCIA': 'badge-error',
      'MANUTENCAO_ABERTA': 'badge-warning',
      'MANUTENCAO_STATUS': 'badge-success'
    };
    return map[acao] ?? 'badge-ghost';
  }

  getLabelAcao(acao: string): string {
    const map: Record<string, string> = {
      'LOGIN': 'Login',
      'CADASTRO': 'Cadastro',
      'ATUALIZAR_PERFIL': 'Perfil',
      'ABRIR_DIARIO': 'Abriu Diário',
      'FECHAR_DIARIO': 'Fechou Diário',
      'ABASTECIMENTO': 'Abastecimento',
      'OCORRENCIA': 'Ocorrência',
      'MANUTENCAO_ABERTA': 'Manutenção Aberta',
      'MANUTENCAO_STATUS': 'Status Manutenção'
    };
    return map[acao] ?? acao;
  }

  // Volta para a página 1 quando a busca, a ação ou a lista (novo período) muda.
  paginaAtual = linkedSignal({
    source: () => [this.busca(), this.filtroAcao(), this.logs()],
    computation: () => 1
  });
readonly porPagina = 10;

logsPaginados = computed(() => {
  const inicio = (this.paginaAtual() - 1) * this.porPagina;
  return this.logsFiltrados().slice(inicio, inicio + this.porPagina);
});

mudarPagina(p: number): void {
  this.paginaAtual.set(p);
}
}