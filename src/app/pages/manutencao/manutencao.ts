import { Component, OnInit, signal, computed, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaginacaoComponent } from '../../shared/components/paginacao/paginacao';
import { CadastrosService } from '../../services/cadastros';
import { ManutencaoService } from '../../services/manutencao';
import { OcorrenciaService } from '../../services/ocorrencia';
import { VeiculoService } from '../../services/veiculo';
import { MecanicoResponse, PostoResponse } from '../../interfaces/cadastros';
import { ManutencaoRequest, ManutencaoResponse, PecaRequest } from '../../interfaces/manutencao';
import { OcorrenciaDetalhada } from '../../interfaces/ocorrencia';
import { VeiculoResponse } from '../../interfaces/veiculo';
import { ErroCarregarComponent } from '../../shared/components/erro-carregar/erro-carregar';
import { AvisosService } from '../../shared/services/avisos';
import { mensagemDeErro } from '../../shared/utils/erros';
import { badgeStatusManutencao, badgeTipoManutencao, rotuloStatusManutencao, rotuloTipoManutencao } from '../../shared/utils/manutencoes';
import { lerComoBase64, validarArquivoFoto } from '../../shared/utils/imagem';
import {
  indiceEdicaoAposRemover, removerPecaDaLista, substituirPeca, totalDaPeca, totalDasPecas,
  totalGeralManutencao, validarPeca
} from '../../shared/utils/pecas';
import { rotuloVeiculo } from '../../shared/utils/placa';
import { badgeStatusOcorrencia, rotuloStatusOcorrencia, statusDaOcorrencia } from '../../shared/utils/ocorrencias';
import { ModalDirective } from '../../shared/directives/modal';
import { ClicavelDirective } from '../../shared/directives/clicavel';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-manutencao',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent, ErroCarregarComponent, ModalDirective, ClicavelDirective, StatusBadgeComponent],
  templateUrl: './manutencao.html',
  styleUrl: './manutencao.css'
})
export class Manutencao implements OnInit {

  manutencoes = signal<ManutencaoResponse[]>([]);
  veiculos = signal<VeiculoResponse[]>([]);
  mecanicos = signal<MecanicoResponse[]>([]);
  postos = signal<PostoResponse[]>([]);
  // Signal: muda depois do FileReader (o app roda sem zone.js; um campo comum não atualizaria a prévia).
  fotoNotaFiscal = signal<string | null>(null);
  carregando = signal(true);
  erroCarregar = signal('');
  modalAberto = signal(false);
  salvando = signal(false);

  busca = signal('');
  filtroTipo = signal('');
  filtroStatus = signal('');

  novaManutencao: ManutencaoRequest = this.resetForm();
  pecasForm: PecaRequest[] = [];
  novaPeca: PecaRequest = this.resetPeca();
  // Posição da peça que está sendo editada no formulário (null = adicionando uma nova).
  indicePecaEmEdicao = signal<number | null>(null);
  ocorrenciaId = '';

  // Volta para a página 1 sempre que a busca ou um filtro muda.
  paginaAtual = linkedSignal({
    source: () => [this.busca(), this.filtroTipo(), this.filtroStatus()],
    computation: () => 1
  });
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

  // Só ocorrências que ainda precisam de manutenção (resolvidas ficam de fora).
  ocorrenciasFiltradas = computed(() => {
    const abertas = this.ocorrencias().filter(o => statusDaOcorrencia(o) !== 'resolvida');
    const termo = this.buscaOcorrencia().toLowerCase();
    if (!termo) return abertas;
    return abertas.filter(o =>
      o.tipo.toLowerCase().includes(termo) ||
      o.descricao.toLowerCase().includes(termo) ||
      o.motoristaNome.toLowerCase().includes(termo) ||
      o.veiculoDescricao.toLowerCase().includes(termo)
    );
  });

  constructor(
    private router: Router,
    private cadastrosService: CadastrosService, private manutencaoService: ManutencaoService, private ocorrenciaService: OcorrenciaService, private veiculoService: VeiculoService,
    private avisos: AvisosService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarManutencoes(): void {
    this.carregando.set(true);
    this.erroCarregar.set('');
    this.manutencaoService.listarManutencoes().subscribe({
      next: (data) => {
        this.manutencoes.set(data);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erroCarregar.set(mensagemDeErro(e));
        this.carregando.set(false);
      }
    });
  }

  private carregarDados(): void {
    this.carregarManutencoes();

    this.veiculoService.listarVeiculos().subscribe({
      next: (data) => this.veiculos.set(data)
    });

    this.cadastrosService.listarMecanicos().subscribe({
      next: (data) => this.mecanicos.set(data)
    });

    this.cadastrosService.listarPostos().subscribe({
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
    this.indicePecaEmEdicao.set(null);
    this.ocorrenciaId = '';
    this.fotoNotaFiscal.set(null);
    this.modalAberto.set(true);
  }

  fecharModal(): void {
    this.modalAberto.set(false);
  }

  // ─── peças (lista LOCAL do modal; a API só recebe ao salvar a manutenção) ──

  // Botão do formulário de peças: adiciona uma nova ou salva a alteração da peça em edição.
  salvarPeca(): void {
    const problema = validarPeca(this.novaPeca);
    if (problema) { this.avisos.erro(problema); return; }
    const emEdicao = this.indicePecaEmEdicao();
    this.pecasForm = emEdicao === null
      ? [...this.pecasForm, { ...this.novaPeca }]
      : substituirPeca(this.pecasForm, emEdicao, this.novaPeca);
    this.cancelarEdicaoPeca();
  }

  // Lápis: carrega a peça nos campos de cima (se outra estava em edição, ela é descartada).
  editarPeca(index: number): void {
    this.novaPeca = { ...this.pecasForm[index] };
    this.indicePecaEmEdicao.set(index);
    document.getElementById('peca-nome')?.focus();
  }

  cancelarEdicaoPeca(): void {
    this.novaPeca = this.resetPeca();
    this.indicePecaEmEdicao.set(null);
  }

  removerPeca(index: number): void {
    const emEdicao = indiceEdicaoAposRemover(this.indicePecaEmEdicao(), index);
    this.pecasForm = removerPecaDaLista(this.pecasForm, index);
    if (emEdicao === null && this.indicePecaEmEdicao() !== null) {
      this.cancelarEdicaoPeca(); // removeram a peça que estava em edição
    } else {
      this.indicePecaEmEdicao.set(emEdicao);
    }
  }

  totalPeca(p: PecaRequest): number {
    return totalDaPeca(p);
  }

  totalPecas(): number {
    return totalDasPecas(this.pecasForm);
  }

  totalGeral(): number {
    return totalGeralManutencao(this.novaManutencao.custoMaoObra, this.pecasForm);
  }

  salvar(): void {
    if (!this.novaManutencao.veiculoId || !this.novaManutencao.descricao?.trim()) {
      this.avisos.erro('Preencha os campos obrigatórios: veículo e descrição.');
      return;
    }
    if ((this.novaManutencao.custoMaoObra ?? 0) < 0) {
      this.avisos.erro('O custo de mão de obra não pode ser negativo.');
      return;
    }

    this.salvando.set(true);
    const request: ManutencaoRequest = {
      ...this.novaManutencao,
      ocorrenciaId: this.ocorrenciaId || null,
      fotoNotaFiscal: this.fotoNotaFiscal(),
      pecas: this.pecasForm
    };

    this.manutencaoService.abrirManutencao(request).subscribe({
      next: (data) => {
        this.manutencoes.update(lista => [data, ...lista]);
        // A ocorrência ligada mudou de status na API: a lista é buscada de novo na próxima vez.
        if (request.ocorrenciaId) this.ocorrencias.set([]);
        this.fecharModal();
        this.salvando.set(false);
        this.avisos.sucesso('Manutenção aberta.');
      },
      error: (e) => {
        this.salvando.set(false);
        this.avisos.erroHttp(e);
      }
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
    // Nota fiscal: só limite de tamanho e formato (não reduz, para continuar legível).
    const problema = validarArquivoFoto(file);
    if (problema) {
      this.avisos.erro(problema);
      input.value = '';
      return;
    }
    lerComoBase64(file)
      .then(base64 => this.fotoNotaFiscal.set(base64))
      .catch(() => this.avisos.erro('Não foi possível ler a imagem.'));
  }

  limparFotoNota(): void {
    this.fotoNotaFiscal.set(null);
  }

  abrirModalOcorrencia(): void {
    this.modalOcorrencia.set(true);
    if (this.ocorrencias().length === 0) {
      this.ocorrenciaService.listarOcorrencias().subscribe({
        next: (data) => this.ocorrencias.set(data),
        error: (e) => {
          this.avisos.erroHttp(e);
          this.fecharModalOcorrencia();
        }
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

  badgeStatus(status: string): string { return badgeStatusManutencao(status); }
  labelStatus(status: string): string { return rotuloStatusManutencao(status); }
  badgeTipo(tipo: string): string { return badgeTipoManutencao(tipo); }
  labelTipo(tipo: string): string { return rotuloTipoManutencao(tipo); }
  badgeStatusOcorrencia(o: OcorrenciaDetalhada): string { return badgeStatusOcorrencia(statusDaOcorrencia(o)); }
  labelStatusOcorrencia(o: OcorrenciaDetalhada): string { return rotuloStatusOcorrencia(statusDaOcorrencia(o)); }
  labelVeiculo(v: VeiculoResponse): string { return rotuloVeiculo(v.descricao, v.placa); }
}