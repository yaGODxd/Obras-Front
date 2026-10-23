import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CadastrosService } from '../../../services/cadastros';
import { ChecklistService } from '../../../services/checklist';
import { UsuarioService } from '../../../services/usuario';
import { VeiculoService } from '../../../services/veiculo';
import { MecanicoRequest, MecanicoResponse, PostoRequest, PostoResponse } from '../../../interfaces/cadastros';
import { ChecklistItemRequest, ChecklistTemplateResponse } from '../../../interfaces/checklist';
import { AtualizarUsuarioRequest, CriarUsuarioRequest, SecretariaResponse, UsuarioResponse } from '../../../interfaces/usuario';
import { TipoVeiculo, VeiculoRequest, VeiculoResponse } from '../../../interfaces/veiculo';
import { ErroCarregarComponent } from '../../../shared/components/erro-carregar/erro-carregar';
import { AvisosService } from '../../../shared/services/avisos';
import { codigoDeErro, mensagemDeErro } from '../../../shared/utils/erros';
import { badgeStatusVeiculo, rotuloStatusVeiculo } from '../../../shared/utils/veiculos';
import { cpfValido, mensagemCpfInvalido, somenteDigitos } from '../../../shared/utils/cpf';
import { ModalDirective } from '../../../shared/directives/modal';
import { formatarMedidor } from '../../../shared/utils/formatos';
import { rotuloPerfil } from '../../../shared/utils/perfis';
import { normalizarPlaca, rotuloPlaca } from '../../../shared/utils/placa';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-cadastros',
  standalone: true,
  imports: [CommonModule, FormsModule, ErroCarregarComponent, ModalDirective, AvatarComponent, StatusBadgeComponent],
  templateUrl: './cadastros.html',
  styleUrl: './cadastros.css'
})
export class CadastrosComponent implements OnInit {

  abaAtiva = signal('usuarios');

  // Usuários
  usuarios = signal<UsuarioResponse[]>([]);
  secretarias = signal<SecretariaResponse[]>([]);
  carregandoUsuarios = signal(true);
  erroUsuarios = signal('');
  modalUsuario = signal(false);
  modalEditarUsuario = signal(false);
  salvandoUsuario = signal(false);
  buscaUsuario = signal('');
  usuarioEditando = signal<UsuarioResponse | null>(null);
  editarUsuarioForm: AtualizarUsuarioRequest = this.resetEditarUsuario();
  novoUsuario: CriarUsuarioRequest = this.resetUsuario();

  usuariosFiltrados = computed(() => {
    const termo = this.buscaUsuario().toLowerCase();
    if (!termo) return this.usuarios();
    return this.usuarios().filter(u =>
      u.nomeCompleto.toLowerCase().includes(termo) ||
      u.login.toLowerCase().includes(termo) ||
      u.perfil.toLowerCase().includes(termo) ||
      (u.matricula?.toLowerCase().includes(termo) ?? false) ||
      (u.secretariaNome?.toLowerCase().includes(termo) ?? false)
    );
  });

  vinculos = ['Efetivo', 'Contratado', 'Terceirizado', 'Estagiário'];
  categoriasCnh = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

  // Veículos
  veiculos = signal<VeiculoResponse[]>([]);
  carregandoVeiculos = signal(true);
  erroVeiculos = signal('');
  modalVeiculo = signal(false);
  salvandoVeiculo = signal(false);
  buscaVeiculo = signal('');
  veiculoEditando = signal<VeiculoResponse | null>(null);
  novoVeiculo: VeiculoRequest = this.resetVeiculo();

  // Vêm da API (GET /tipos-veiculo). Usados só no CADASTRO: na edição a API ignora o tipo.
  tiposVeiculo = signal<TipoVeiculo[]>([]);
  erroTiposVeiculo = signal('');

  veiculosFiltrados = computed(() => {
    const termo = this.buscaVeiculo().toLowerCase();
    if (!termo) return this.veiculos();
    return this.veiculos().filter(v =>
      v.descricao.toLowerCase().includes(termo) ||
      (v.placa?.toLowerCase().includes(termo) ?? false) ||
      v.tipoNome.toLowerCase().includes(termo) ||
      (v.marca?.toLowerCase().includes(termo) ?? false) ||
      (v.modelo?.toLowerCase().includes(termo) ?? false)
    );
  });

  // Mecânicos
  mecanicos = signal<MecanicoResponse[]>([]);
  carregandoMecanicos = signal(true);
  erroMecanicos = signal('');
  modalMecanico = signal(false);
  salvandoMecanico = signal(false);
  buscaMecanico = signal('');
  mecanicoEditando = signal<MecanicoResponse | null>(null);
  novoMecanico: MecanicoRequest = this.resetMecanico();

  mecanicosFiltrados = computed(() => {
    const termo = this.buscaMecanico().toLowerCase();
    if (!termo) return this.mecanicos();
    return this.mecanicos().filter(m =>
      m.nome.toLowerCase().includes(termo) ||
      (m.especialidade?.toLowerCase().includes(termo) ?? false) ||
      (m.telefone?.toLowerCase().includes(termo) ?? false)
    );
  });

  // Postos
  postos = signal<PostoResponse[]>([]);
  carregandoPostos = signal(true);
  erroPostos = signal('');
  modalPosto = signal(false);
  salvandoPosto = signal(false);
  buscaPosto = signal('');
  postoEditando = signal<PostoResponse | null>(null);
  novoPosto: PostoRequest = this.resetPosto();

  postosFiltrados = computed(() => {
    const termo = this.buscaPosto().toLowerCase();
    if (!termo) return this.postos();
    return this.postos().filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      (p.cidade?.toLowerCase().includes(termo) ?? false) ||
      (p.endereco?.toLowerCase().includes(termo) ?? false)
    );
  });

  // Checklist
  templates = signal<ChecklistTemplateResponse[]>([]);
  carregandoChecklist = signal(true);
  erroChecklist = signal('');
  templateAtivo = signal<ChecklistTemplateResponse | null>(null);
  modalItem = signal(false);
  salvandoItem = signal(false);
  novoItem: ChecklistItemRequest = this.resetItem();

  constructor(
    private cadastrosService: CadastrosService,
    private checklistService: ChecklistService,
    private usuarioService: UsuarioService,
    private veiculoService: VeiculoService,
    private avisos: AvisosService
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregarVeiculos();
    this.carregarMecanicos();
    this.carregarPostos();
    this.carregarChecklist();
    this.usuarioService.listarSecretarias().subscribe({
      next: (data) => this.secretarias.set(data)
    });
    this.carregarTiposVeiculo();
  }

  carregarTiposVeiculo(): void {
    this.erroTiposVeiculo.set('');
    this.veiculoService.listarTiposVeiculo().subscribe({
      next: (data) => this.tiposVeiculo.set(data),
      error: (e) => this.erroTiposVeiculo.set(mensagemDeErro(e))
    });
  }

  // ==================== USUÁRIOS ====================

  carregarUsuarios(): void {
    this.carregandoUsuarios.set(true);
    this.erroUsuarios.set('');
    this.usuarioService.listarUsuarios().subscribe({
      next: (data) => { this.usuarios.set(data); this.carregandoUsuarios.set(false); },
      error: (e) => { this.erroUsuarios.set(mensagemDeErro(e)); this.carregandoUsuarios.set(false); }
    });
  }

  abrirModalUsuario(): void { this.novoUsuario = this.resetUsuario(); this.modalUsuario.set(true); }
  fecharModalUsuario(): void { this.modalUsuario.set(false); }

  salvarUsuario(): void {
    const u = this.novoUsuario;
    if (!u.nomeCompleto?.trim() || !u.login?.trim() || !u.senha || !u.cpf?.trim()) {
      this.avisos.erro('Preencha os campos obrigatórios: nome completo, CPF, login e senha.');
      return;
    }
    if (!cpfValido(u.cpf)) {
      this.avisos.erro(mensagemCpfInvalido());
      return;
    }
    this.salvandoUsuario.set(true);
    // A API grava o CPF como vier: enviamos só os dígitos.
    this.usuarioService.criarUsuario({ ...u, cpf: somenteDigitos(u.cpf) }).subscribe({
      next: () => { this.carregarUsuarios(); this.fecharModalUsuario(); this.salvandoUsuario.set(false); this.avisos.sucesso('Usuário cadastrado.'); },
      error: (e) => { this.salvandoUsuario.set(false); this.avisos.erroHttp(e); }
    });
  }

  abrirModalEditar(u: UsuarioResponse): void {
    this.usuarioEditando.set(u);
    this.editarUsuarioForm = {
      nomeCompleto: u.nomeCompleto, fotoPerfil: null, matricula: u.matricula,
      vinculo: u.vinculo, secretariaId: u.secretariaId, categoriaCnh: u.categoriaCnh,
      validadeCnh: u.validadeCnh, telefone: u.telefone
    };
    this.modalEditarUsuario.set(true);
  }

  fecharModalEditar(): void { this.modalEditarUsuario.set(false); this.usuarioEditando.set(null); }

  salvarEdicaoUsuario(): void {
    const u = this.usuarioEditando();
    if (!u) return;
    this.salvandoUsuario.set(true);
    this.usuarioService.atualizarUsuario(u.login, this.editarUsuarioForm).subscribe({
      next: () => { this.carregarUsuarios(); this.fecharModalEditar(); this.salvandoUsuario.set(false); this.avisos.sucesso('Usuário atualizado.'); },
      error: (e) => { this.salvandoUsuario.set(false); this.avisos.erroHttp(e); }
    });
  }

  alterarAtivo(usuario: UsuarioResponse): void {
    this.usuarioService.alterarAtivo(usuario.login, !usuario.ativo).subscribe({
      next: () => { this.carregarUsuarios(); this.avisos.sucesso(usuario.ativo ? 'Usuário desativado.' : 'Usuário ativado.'); },
      error: (e) => this.avisos.erroHttp(e)
    });
  }

  resetUsuario(): CriarUsuarioRequest {
    return { nomeCompleto: '', cpf: '', login: '', senha: '', perfil: 'motorista',
      matricula: null, vinculo: null, secretariaId: null, categoriaCnh: null, validadeCnh: null, telefone: null };
  }

  resetEditarUsuario(): AtualizarUsuarioRequest {
    return { nomeCompleto: null, fotoPerfil: null, matricula: null,
      vinculo: null, secretariaId: null, categoriaCnh: null, validadeCnh: null, telefone: null };
  }

  badgePerfil(perfil: string): string { return perfil === 'gestor' ? 'badge-primary' : 'badge-info'; }
  labelPerfil(perfil: string): string { return rotuloPerfil(perfil); }

  // ==================== VEÍCULOS ====================

  carregarVeiculos(): void {
    this.carregandoVeiculos.set(true);
    this.erroVeiculos.set('');
    this.veiculoService.listarVeiculos().subscribe({
      next: (data) => { this.veiculos.set(data); this.carregandoVeiculos.set(false); },
      error: (e) => { this.erroVeiculos.set(mensagemDeErro(e)); this.carregandoVeiculos.set(false); }
    });
  }

  abrirModalVeiculo(veiculo?: VeiculoResponse): void {
    if (veiculo) {
      this.veiculoEditando.set(veiculo);
      this.novoVeiculo = {
        tipoId: '', placa: veiculo.placa, descricao: veiculo.descricao,
        medidorAtual: veiculo.medidorAtual, marca: veiculo.marca, modelo: veiculo.modelo,
        ano: veiculo.ano, cor: veiculo.cor, renavam: veiculo.renavam,
        chassi: veiculo.chassi, comboio: veiculo.comboio
      };
    } else {
      this.veiculoEditando.set(null);
      this.novoVeiculo = this.resetVeiculo();
    }
    this.modalVeiculo.set(true);
  }

  fecharModalVeiculo(): void { this.modalVeiculo.set(false); this.veiculoEditando.set(null); }

  salvarVeiculo(): void {
    const editando = this.veiculoEditando();
    const v = this.novoVeiculo;
    if (!v.descricao?.trim()) {
      this.avisos.erro('Preencha a descrição do veículo.');
      return;
    }
    if (!editando && !v.tipoId) {
      this.avisos.erro('Escolha o tipo do veículo.');
      return;
    }
    if ((v.medidorAtual ?? 0) < 0) {
      this.avisos.erro('O medidor não pode ser negativo.');
      return;
    }
    const request = { ...v, placa: normalizarPlaca(v.placa) };
    this.salvandoVeiculo.set(true);
    if (editando) {
      // Na edição a API ignora o tipoId, mas exige o campo: vai '' (aceito e sem efeito).
      this.veiculoService.atualizarVeiculo(editando.id, request).subscribe({
        next: () => { this.carregarVeiculos(); this.fecharModalVeiculo(); this.salvandoVeiculo.set(false); this.avisos.sucesso('Veículo atualizado.'); },
        error: (e) => { this.salvandoVeiculo.set(false); this.avisos.erroHttp(e); }
      });
    } else {
      this.veiculoService.cadastrarVeiculo(request).subscribe({
        next: () => { this.carregarVeiculos(); this.fecharModalVeiculo(); this.salvandoVeiculo.set(false); this.avisos.sucesso('Veículo cadastrado.'); },
        error: (e) => {
          this.salvandoVeiculo.set(false);
          const inativo = codigoDeErro(e) === 'PLACA_DE_VEICULO_INATIVO'
            ? this.veiculos().find(x => x.status === 'inativo' && normalizarPlaca(x.placa) === request.placa)
            : undefined;
          if (inativo) this.oferecerReativacao(inativo);
          else this.avisos.erroHttp(e);
        }
      });
    }
  }

  // 409 PLACA_DE_VEICULO_INATIVO: a placa é de um veículo inativo; reativar em vez de cadastrar outro.
  private oferecerReativacao(veiculo: VeiculoResponse): void {
    if (!confirm(`A placa ${rotuloPlaca(veiculo.placa)} é do veículo inativo "${veiculo.descricao}". Deseja reativá-lo em vez de cadastrar um novo?`)) return;
    this.fecharModalVeiculo();
    this.enviarReativacao(veiculo);
  }

  inativarVeiculo(veiculo: VeiculoResponse): void {
    if (!confirm(`Deseja inativar o veículo ${veiculo.descricao}?`)) return;
    this.veiculoService.inativarVeiculo(veiculo.id).subscribe({
      next: () => { this.carregarVeiculos(); this.avisos.sucesso('Veículo inativado.'); },
      error: (e) => this.avisos.erroHttp(e)
    });
  }

  reativarVeiculo(veiculo: VeiculoResponse): void {
    if (!confirm(`Deseja reativar o veículo ${veiculo.descricao}?`)) return;
    this.enviarReativacao(veiculo);
  }

  private enviarReativacao(veiculo: VeiculoResponse): void {
    this.veiculoService.reativarVeiculo(veiculo.id).subscribe({
      next: () => { this.carregarVeiculos(); this.avisos.sucesso('Veículo reativado.'); },
      error: (e) => this.avisos.erroHttp(e)
    });
  }

  resetVeiculo(): VeiculoRequest {
    return { tipoId: '', placa: null, descricao: '', medidorAtual: 0,
      marca: null, modelo: null, ano: null, cor: null, renavam: null, chassi: null, comboio: false };
  }

  badgeStatusVeiculo(status: string): string {
    return badgeStatusVeiculo(status);
  }

  labelStatusVeiculo(status: string): string {
    return rotuloStatusVeiculo(status);
  }

  medidor(v: VeiculoResponse): string {
    return formatarMedidor(v.medidorAtual, v.tipoMedidor);
  }

  // ==================== MECÂNICOS ====================

  carregarMecanicos(): void {
    this.carregandoMecanicos.set(true);
    this.erroMecanicos.set('');
    this.cadastrosService.listarMecanicos().subscribe({
      next: (data) => { this.mecanicos.set(data); this.carregandoMecanicos.set(false); },
      error: (e) => { this.erroMecanicos.set(mensagemDeErro(e)); this.carregandoMecanicos.set(false); }
    });
  }

  abrirModalMecanico(m?: MecanicoResponse): void {
    if (m) {
      this.mecanicoEditando.set(m);
      this.novoMecanico = { nome: m.nome, telefone: m.telefone, especialidade: m.especialidade };
    } else {
      this.mecanicoEditando.set(null);
      this.novoMecanico = this.resetMecanico();
    }
    this.modalMecanico.set(true);
  }

  fecharModalMecanico(): void { this.modalMecanico.set(false); this.mecanicoEditando.set(null); }

  salvarMecanico(): void {
    if (!this.novoMecanico.nome?.trim()) { this.avisos.erro('Preencha o nome do mecânico.'); return; }
    this.salvandoMecanico.set(true);
    const editando = this.mecanicoEditando();
    if (editando) {
      this.cadastrosService.atualizarMecanico(editando.id, this.novoMecanico).subscribe({
        next: () => { this.carregarMecanicos(); this.fecharModalMecanico(); this.salvandoMecanico.set(false); this.avisos.sucesso('Mecânico atualizado.'); },
        error: (e) => { this.salvandoMecanico.set(false); this.avisos.erroHttp(e); }
      });
    } else {
      this.cadastrosService.criarMecanico(this.novoMecanico).subscribe({
        next: () => { this.carregarMecanicos(); this.fecharModalMecanico(); this.salvandoMecanico.set(false); this.avisos.sucesso('Mecânico cadastrado.'); },
        error: (e) => { this.salvandoMecanico.set(false); this.avisos.erroHttp(e); }
      });
    }
  }

  alterarAtivoMecanico(m: MecanicoResponse): void {
    this.cadastrosService.alterarAtivoMecanico(m.id, !m.ativo).subscribe({
      next: () => { this.carregarMecanicos(); this.avisos.sucesso(m.ativo ? 'Mecânico desativado.' : 'Mecânico ativado.'); },
      error: (e) => this.avisos.erroHttp(e)
    });
  }

  resetMecanico(): MecanicoRequest { return { nome: '', telefone: null, especialidade: null }; }

  // ==================== POSTOS ====================

  carregarPostos(): void {
    this.carregandoPostos.set(true);
    this.erroPostos.set('');
    this.cadastrosService.listarPostos().subscribe({
      next: (data) => { this.postos.set(data); this.carregandoPostos.set(false); },
      error: (e) => { this.erroPostos.set(mensagemDeErro(e)); this.carregandoPostos.set(false); }
    });
  }

  abrirModalPosto(p?: PostoResponse): void {
    if (p) {
      this.postoEditando.set(p);
      this.novoPosto = { nome: p.nome, endereco: p.endereco, cidade: p.cidade };
    } else {
      this.postoEditando.set(null);
      this.novoPosto = this.resetPosto();
    }
    this.modalPosto.set(true);
  }

  fecharModalPosto(): void { this.modalPosto.set(false); this.postoEditando.set(null); }

  salvarPosto(): void {
    if (!this.novoPosto.nome?.trim()) { this.avisos.erro('Preencha o nome do posto.'); return; }
    this.salvandoPosto.set(true);
    const editando = this.postoEditando();
    if (editando) {
      this.cadastrosService.atualizarPosto(editando.id, this.novoPosto).subscribe({
        next: () => { this.carregarPostos(); this.fecharModalPosto(); this.salvandoPosto.set(false); this.avisos.sucesso('Posto atualizado.'); },
        error: (e) => { this.salvandoPosto.set(false); this.avisos.erroHttp(e); }
      });
    } else {
      this.cadastrosService.criarPosto(this.novoPosto).subscribe({
        next: () => { this.carregarPostos(); this.fecharModalPosto(); this.salvandoPosto.set(false); this.avisos.sucesso('Posto cadastrado.'); },
        error: (e) => { this.salvandoPosto.set(false); this.avisos.erroHttp(e); }
      });
    }
  }

  alterarAtivoPosto(p: PostoResponse): void {
    this.cadastrosService.alterarAtivoPosto(p.id, !p.ativo).subscribe({
      next: () => { this.carregarPostos(); this.avisos.sucesso(p.ativo ? 'Posto desativado.' : 'Posto ativado.'); },
      error: (e) => this.avisos.erroHttp(e)
    });
  }

  resetPosto(): PostoRequest { return { nome: '', endereco: null, cidade: null }; }

  // ==================== CHECKLIST ====================

  carregarChecklist(): void {
    this.carregandoChecklist.set(true);
    this.erroChecklist.set('');
    this.checklistService.listarTemplates().subscribe({
      next: (data) => {
        this.templates.set(data);
        if (data.length > 0) this.templateAtivo.set(data[0]);
        this.carregandoChecklist.set(false);
      },
      error: (e) => { this.erroChecklist.set(mensagemDeErro(e)); this.carregandoChecklist.set(false); }
    });
  }

  abrirModalItem(): void {
    this.novoItem = this.resetItem();
    this.modalItem.set(true);
  }

  fecharModalItem(): void { this.modalItem.set(false); }

  salvarItem(): void {
    const template = this.templateAtivo();
    if (!template) { this.avisos.erro('Nenhum checklist carregado para receber o item.'); return; }
    if (!this.novoItem.descricao?.trim()) { this.avisos.erro('Preencha a descrição do item.'); return; }
    if (!(this.novoItem.ordem >= 1)) { this.avisos.erro('A ordem precisa ser 1 ou maior.'); return; }
    this.salvandoItem.set(true);
    this.novoItem.templateId = template.id;
    this.checklistService.adicionarItemChecklist(this.novoItem).subscribe({
      next: () => { this.carregarChecklist(); this.fecharModalItem(); this.salvandoItem.set(false); this.avisos.sucesso('Item adicionado ao checklist.'); },
      error: (e) => { this.salvandoItem.set(false); this.avisos.erroHttp(e); }
    });
  }

  alterarAtivoItem(id: string, ativo: boolean): void {
    this.checklistService.alterarAtivoItemChecklist(id, !ativo).subscribe({
      next: () => { this.carregarChecklist(); this.avisos.sucesso(ativo ? 'Item desativado.' : 'Item ativado.'); },
      error: (e) => this.avisos.erroHttp(e)
    });
  }

  resetItem(): ChecklistItemRequest {
    return {
      templateId: '',
      descricao: '',
      obrigatorio: true,
      ordem: (this.templateAtivo()?.itens.length ?? 0) + 1
    };
  }
}