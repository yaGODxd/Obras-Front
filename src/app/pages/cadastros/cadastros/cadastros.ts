import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService, UsuarioResponse, CriarUsuarioRequest, VeiculoResponse, VeiculoRequest, SecretariaResponse, AtualizarUsuarioRequest, MecanicoResponse, MecanicoRequest, PostoResponse, PostoRequest, ChecklistTemplateResponse, ChecklistItemRequest } from '../../../services/usuario';

@Component({
  selector: 'app-cadastros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastros.html',
  styleUrl: './cadastros.css'
})
export class CadastrosComponent implements OnInit {

  abaAtiva = signal('usuarios');

  // Usuários
  usuarios = signal<UsuarioResponse[]>([]);
  secretarias = signal<SecretariaResponse[]>([]);
  carregandoUsuarios = signal(true);
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
  modalVeiculo = signal(false);
  salvandoVeiculo = signal(false);
  buscaVeiculo = signal('');
  veiculoEditando = signal<VeiculoResponse | null>(null);
  novoVeiculo: VeiculoRequest = this.resetVeiculo();

  tiposVeiculo = [
  { id: 'ab3a29b6-b555-4dcf-8df3-ec4ba621c0df', nome: 'Maquinário Pesado', medidor: 'horimetro' },
  { id: 'fe1d2bbb-c67e-4d45-bf89-37e2597eea78', nome: 'Caminhão', medidor: 'hodometro' },
  { id: 'c9417daf-3137-401d-814e-2a92785f16b8', nome: 'Veículo Leve', medidor: 'hodometro' }
];

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
  templateAtivo = signal<ChecklistTemplateResponse | null>(null);
  modalItem = signal(false);
  salvandoItem = signal(false);
  novoItem: ChecklistItemRequest = this.resetItem();

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregarVeiculos();
    this.carregarMecanicos();
    this.carregarPostos();
    this.carregarChecklist();
    this.usuarioService.listarSecretarias().subscribe({
      next: (data) => this.secretarias.set(data)
    });
  }

  // ==================== USUÁRIOS ====================

  carregarUsuarios(): void {
    this.carregandoUsuarios.set(true);
    this.usuarioService.listarUsuarios().subscribe({
      next: (data) => { this.usuarios.set(data); this.carregandoUsuarios.set(false); },
      error: () => this.carregandoUsuarios.set(false)
    });
  }

  abrirModalUsuario(): void { this.novoUsuario = this.resetUsuario(); this.modalUsuario.set(true); }
  fecharModalUsuario(): void { this.modalUsuario.set(false); }

  salvarUsuario(): void {
    if (!this.novoUsuario.nomeCompleto || !this.novoUsuario.login || !this.novoUsuario.senha) return;
    this.salvandoUsuario.set(true);
    this.usuarioService.criarUsuario(this.novoUsuario).subscribe({
      next: () => { this.carregarUsuarios(); this.fecharModalUsuario(); this.salvandoUsuario.set(false); },
      error: () => this.salvandoUsuario.set(false)
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
      next: () => { this.carregarUsuarios(); this.fecharModalEditar(); this.salvandoUsuario.set(false); },
      error: () => this.salvandoUsuario.set(false)
    });
  }

  alterarAtivo(usuario: UsuarioResponse): void {
    this.usuarioService.alterarAtivo(usuario.login, !usuario.ativo).subscribe({
      next: () => this.carregarUsuarios()
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
  labelPerfil(perfil: string): string { return perfil === 'gestor' ? 'Gestor' : 'Motorista'; }

  // ==================== VEÍCULOS ====================

  carregarVeiculos(): void {
    this.carregandoVeiculos.set(true);
    this.usuarioService.listarVeiculos().subscribe({
      next: (data) => { this.veiculos.set(data); this.carregandoVeiculos.set(false); },
      error: () => this.carregandoVeiculos.set(false)
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
    if (!this.novoVeiculo.descricao) return;
    this.salvandoVeiculo.set(true);
    const editando = this.veiculoEditando();
    if (editando) {
      this.usuarioService.atualizarVeiculo(editando.id, this.novoVeiculo).subscribe({
        next: () => { this.carregarVeiculos(); this.fecharModalVeiculo(); this.salvandoVeiculo.set(false); },
        error: () => this.salvandoVeiculo.set(false)
      });
    } else {
      if (!this.novoVeiculo.tipoId) { this.salvandoVeiculo.set(false); return; }
      this.usuarioService.cadastrarVeiculo(this.novoVeiculo).subscribe({
        next: () => { this.carregarVeiculos(); this.fecharModalVeiculo(); this.salvandoVeiculo.set(false); },
        error: () => this.salvandoVeiculo.set(false)
      });
    }
  }

  inativarVeiculo(veiculo: VeiculoResponse): void {
    if (!confirm(`Deseja inativar o veículo ${veiculo.descricao}?`)) return;
    this.usuarioService.inativarVeiculo(veiculo.id).subscribe({ next: () => this.carregarVeiculos() });
  }

  resetVeiculo(): VeiculoRequest {
    return { tipoId: '', placa: null, descricao: '', medidorAtual: 0,
      marca: null, modelo: null, ano: null, cor: null, renavam: null, chassi: null, comboio: false };
  }

  badgeStatusVeiculo(status: string): string {
    const map: any = { 'disponivel': 'badge-success', 'em_uso': 'badge-warning', 'em_manutencao': 'badge-error', 'inativo': 'badge-ghost' };
    return map[status] ?? 'badge-ghost';
  }

  labelStatusVeiculo(status: string): string {
    const map: any = { 'disponivel': 'Disponível', 'em_uso': 'Em uso', 'em_manutencao': 'Em manutenção', 'inativo': 'Inativo' };
    return map[status] ?? status;
  }

  // ==================== MECÂNICOS ====================

  carregarMecanicos(): void {
    this.carregandoMecanicos.set(true);
    this.usuarioService.listarMecanicos().subscribe({
      next: (data) => { this.mecanicos.set(data); this.carregandoMecanicos.set(false); },
      error: () => this.carregandoMecanicos.set(false)
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
    if (!this.novoMecanico.nome) return;
    this.salvandoMecanico.set(true);
    const editando = this.mecanicoEditando();
    if (editando) {
      this.usuarioService.atualizarMecanico(editando.id, this.novoMecanico).subscribe({
        next: () => { this.carregarMecanicos(); this.fecharModalMecanico(); this.salvandoMecanico.set(false); },
        error: () => this.salvandoMecanico.set(false)
      });
    } else {
      this.usuarioService.criarMecanico(this.novoMecanico).subscribe({
        next: () => { this.carregarMecanicos(); this.fecharModalMecanico(); this.salvandoMecanico.set(false); },
        error: () => this.salvandoMecanico.set(false)
      });
    }
  }

  alterarAtivoMecanico(m: MecanicoResponse): void {
    this.usuarioService.alterarAtivoMecanico(m.id, !m.ativo).subscribe({ next: () => this.carregarMecanicos() });
  }

  resetMecanico(): MecanicoRequest { return { nome: '', telefone: null, especialidade: null }; }

  // ==================== POSTOS ====================

  carregarPostos(): void {
    this.carregandoPostos.set(true);
    this.usuarioService.listarPostos().subscribe({
      next: (data) => { this.postos.set(data); this.carregandoPostos.set(false); },
      error: () => this.carregandoPostos.set(false)
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
    if (!this.novoPosto.nome) return;
    this.salvandoPosto.set(true);
    const editando = this.postoEditando();
    if (editando) {
      this.usuarioService.atualizarPosto(editando.id, this.novoPosto).subscribe({
        next: () => { this.carregarPostos(); this.fecharModalPosto(); this.salvandoPosto.set(false); },
        error: () => this.salvandoPosto.set(false)
      });
    } else {
      this.usuarioService.criarPosto(this.novoPosto).subscribe({
        next: () => { this.carregarPostos(); this.fecharModalPosto(); this.salvandoPosto.set(false); },
        error: () => this.salvandoPosto.set(false)
      });
    }
  }

  alterarAtivoPosto(p: PostoResponse): void {
    this.usuarioService.alterarAtivoPosto(p.id, !p.ativo).subscribe({ next: () => this.carregarPostos() });
  }

  resetPosto(): PostoRequest { return { nome: '', endereco: null, cidade: null }; }

  // ==================== CHECKLIST ====================

  carregarChecklist(): void {
    this.carregandoChecklist.set(true);
    this.usuarioService.listarTemplates().subscribe({
      next: (data) => {
        this.templates.set(data);
        if (data.length > 0) this.templateAtivo.set(data[0]);
        this.carregandoChecklist.set(false);
      },
      error: () => this.carregandoChecklist.set(false)
    });
  }

  abrirModalItem(): void {
    this.novoItem = this.resetItem();
    this.modalItem.set(true);
  }

  fecharModalItem(): void { this.modalItem.set(false); }

  salvarItem(): void {
    const template = this.templateAtivo();
    if (!template || !this.novoItem.descricao) return;
    this.salvandoItem.set(true);
    this.novoItem.templateId = template.id;
    this.usuarioService.adicionarItemChecklist(this.novoItem).subscribe({
      next: () => { this.carregarChecklist(); this.fecharModalItem(); this.salvandoItem.set(false); },
      error: () => this.salvandoItem.set(false)
    });
  }

  alterarAtivoItem(id: string, ativo: boolean): void {
    this.usuarioService.alterarAtivoItemChecklist(id, !ativo).subscribe({
      next: () => this.carregarChecklist()
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