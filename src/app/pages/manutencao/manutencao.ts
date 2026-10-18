import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaginacaoComponent } from '../../shared/components/paginacao/paginacao';
import { UsuarioService, ManutencaoResponse, ManutencaoRequest, PecaRequest, VeiculoResponse, OcorrenciaDetalhada, MecanicoResponse, PostoResponse } from '../../services/usuario';

@Component({
  selector: 'app-manutencao',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginacaoComponent],
  templateUrl: './manutencao.html',
  styleUrl: './manutencao.css'
})
export class Manutencao implements OnInit {

  manutencoes = signal<ManutencaoResponse[]>([]);
  veiculos = signal<VeiculoResponse[]>([]);
  mecanicos = signal<MecanicoResponse[]>([]);
  postos = signal<PostoResponse[]>([]);
  fotoNotaFiscal: string | null = null;
  carregando = signal(true);
  modalAberto = signal(false);
  salvando = signal(false);

  busca = signal('');
  filtroTipo = signal('');
  filtroStatus = signal('');

  novaManutencao: ManutencaoRequest = this.resetForm();
  pecasForm: PecaRequest[] = [];
  novaPeca: PecaRequest = this.resetPeca();
  ocorrenciaId = '';

  paginaAtual = signal(1);
  readonly porPagina = 10;

  ocorrencias = signal<OcorrenciaDetalhada[]>([]);
  modalOcorrencia = signal(false);
  buscaOcorrencia = signal('');
  ocorrenciaSelecionadaNome = signal('');

  manutencoesFiltradas = computed(() => {
    let lista = this.manutencoes();
    const termo = this.busca().toLowerCase();
    if (termo) {
      lista = lista.filter(m =>
        m.veiculoDescricao.toLowerCase().includes(termo) ||
        (m.veiculoPlaca?.toLowerCase().includes(termo) ?? false) ||
        m.descricao.toLowerCase().includes(termo) ||
        (m.mecanicoResponsavel?.toLowerCase().includes(termo) ?? false)
      );
    }
    if (this.filtroTipo()) lista = lista.filter(m => m.tipo === this.filtroTipo());
    if (this.filtroStatus()) lista = lista.filter(m => m.status === this.filtroStatus());
    return lista;
  });

  manutencoesPaginadas = computed(() => {
    const inicio = (this.paginaAtual() - 1) * this.porPagina;
    return this.manutencoesFiltradas().slice(inicio, inicio + this.porPagina);
  });

  totalAbertas = computed(() =>
    this.manutencoes().filter(m => m.status !== 'concluida').length
  );

  totalCusto = computed(() =>
    this.manutencoesFiltradas().reduce((acc, m) => acc + m.custoTotal, 0)
  );

  ocorrenciasFiltradas = computed(() => {
    const termo = this.buscaOcorrencia().toLowerCase();
    if (!termo) return this.ocorrencias();
    return this.ocorrencias().filter(o =>
      o.tipo.toLowerCase().includes(termo) ||
      o.descricao.toLowerCase().includes(termo) ||
      o.motoristaNome.toLowerCase().includes(termo) ||
      o.veiculoDescricao.toLowerCase().includes(termo)
    );
  });

  constructor(
    private router: Router,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  private carregarDados(): void {
    this.usuarioService.listarManutencoes().subscribe({
      next: (data) => {
        this.manutencoes.set(data);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });

    this.usuarioService.listarVeiculos().subscribe({
      next: (data) => this.veiculos.set(data)
    });

    this.usuarioService.listarMecanicos().subscribe({
      next: (data) => this.mecanicos.set(data)
    });

    this.usuarioService.listarPostos().subscribe({
      next: (data) => this.postos.set(data)
    });
  }

  resetForm(): ManutencaoRequest {
    return {
      veiculoId: '',
      ocorrenciaId: null,
      tipo: 'corretiva',
      descricao: '',
      mecanicoResponsavel: null,
      oficina: null,
      custoMaoObra: 0,
      observacoes: null,
      fotoNotaFiscal: null,
      pecas: []
    };
  }

  resetPeca(): PecaRequest {
    return {
      nomePeca: '',
      codigoPeca: null,
      marcaPeca: null,
      quantidade: 1,
      valorUnitario: 0
    };
  }

  abrirModal(): void {
    this.novaManutencao = this.resetForm();
    this.pecasForm = [];
    this.novaPeca = this.resetPeca();
    this.ocorrenciaId = '';
    this.fotoNotaFiscal = null;
    this.modalAberto.set(true);
  }

  fecharModal(): void {
    this.modalAberto.set(false);
  }

  adicionarPeca(): void {
    if (!this.novaPeca.nomePeca || this.novaPeca.quantidade <= 0) return;
    this.pecasForm.push({ ...this.novaPeca });
    this.novaPeca = this.resetPeca();
  }

  removerPeca(index: number): void {
    this.pecasForm.splice(index, 1);
  }

  totalPecas(): number {
    return this.pecasForm.reduce((acc, p) => acc + (p.quantidade * p.valorUnitario), 0);
  }

  totalGeral(): number {
    return (this.novaManutencao.custoMaoObra ?? 0) + this.totalPecas();
  }

  salvar(): void {
    if (!this.novaManutencao.veiculoId || !this.novaManutencao.descricao) return;

    this.salvando.set(true);
    const request: ManutencaoRequest = {
      ...this.novaManutencao,
      ocorrenciaId: this.ocorrenciaId || null,
      fotoNotaFiscal: this.fotoNotaFiscal,
      pecas: this.pecasForm
    };

    this.usuarioService.abrirManutencao(request).subscribe({
      next: (data) => {
        this.manutencoes.update(lista => [data, ...lista]);
        this.fecharModal();
        this.salvando.set(false);
      },
      error: () => this.salvando.set(false)
    });
  }

  verDetalhe(id: string): void {
    this.router.navigate(['/manutencao', id]);
  }

  limparFiltros(): void {
    this.paginaAtual.set(1);
    this.busca.set('');
    this.filtroTipo.set('');
    this.filtroStatus.set('');
  }

  mudarPagina(p: number): void {
    this.paginaAtual.set(p);
  }

  onFotoNotaFiscal(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.fotoNotaFiscal = base64;
    };
    reader.readAsDataURL(file);
  }

  limparFotoNota(): void {
    this.fotoNotaFiscal = null;
  }

  abrirModalOcorrencia(): void {
    this.modalOcorrencia.set(true);
    if (this.ocorrencias().length === 0) {
      this.usuarioService.listarOcorrencias().subscribe({
        next: (data) => this.ocorrencias.set(data)
      });
    }
  }

  fecharModalOcorrencia(): void {
    this.modalOcorrencia.set(false);
    this.buscaOcorrencia.set('');
  }

  selecionarOcorrencia(o: OcorrenciaDetalhada): void {
    this.ocorrenciaId = o.id;
    this.ocorrenciaSelecionadaNome.set(`${o.tipo} — ${o.veiculoDescricao} (${new Date(o.registradoEm!).toLocaleDateString('pt-BR')})`);
    this.fecharModalOcorrencia();
  }

  limparOcorrencia(): void {
    this.ocorrenciaId = '';
    this.ocorrenciaSelecionadaNome.set('');
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