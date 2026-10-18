import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService, LogResponse } from '../../../services/usuario';
import { PaginacaoComponent } from '../../../shared/components/paginacao/paginacao';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class LogsComponent implements OnInit {

  logs = signal<LogResponse[]>([]);
  carregando = signal(true);
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

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.carregarLogs();
  }

  carregarLogs(): void {
    this.carregando.set(true);
    this.usuarioService.listarLogs(
      undefined,
      undefined,
      this.filtroInicio() || undefined,
      this.filtroFim() || undefined
    ).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
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
    const map: any = {
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
    const map: any = {
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

  paginaAtual = signal(1);
readonly porPagina = 10;

logsPaginados = computed(() => {
  const inicio = (this.paginaAtual() - 1) * this.porPagina;
  return this.logsFiltrados().slice(inicio, inicio + this.porPagina);
});

mudarPagina(p: number): void {
  this.paginaAtual.set(p);
}
}