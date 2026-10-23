import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CadastrosComponent } from './cadastros';
import { AvisosService } from '../../../shared/services/avisos';
import { environment } from '../../../../environments/environment';
import { VeiculoResponse } from '../../../interfaces/veiculo';

const API = environment.apiUrl;

describe('CadastrosComponent', () => {
  let component: CadastrosComponent;
  let fixture: ComponentFixture<CadastrosComponent>;
  let api: HttpTestingController;
  let avisos: AvisosService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastrosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CadastrosComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(HttpTestingController);
    avisos = TestBed.inject(AvisosService);
    await fixture.whenStable();
  });

  function preencherUsuario(): void {
    component.novoUsuario = { ...component.resetUsuario(), nomeCompleto: 'João', login: 'joao', senha: '123', cpf: '529.982.247-25' };
  }

  const pedidosCadastro = () => api.match(`${API}/auth/cadastrar`);

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('400 sem corpo (rota antiga) mostra a mensagem padrão e mantém o modal aberto', () => {
    component.abrirModalUsuario();
    preencherUsuario();
    component.salvarUsuario();

    api.expectOne(`${API}/auth/cadastrar`).flush(null, { status: 400, statusText: 'Bad Request' });

    expect(avisos.avisos()[0]).toEqual(expect.objectContaining({
      tipo: 'erro',
      texto: 'Não foi possível salvar. Confira os campos e se já não existe um cadastro igual (login, CPF, placa).',
    }));
    expect(component.modalUsuario()).toBe(true);
    expect(component.salvandoUsuario()).toBe(false);
  });

  it('sucesso mostra aviso e fecha o modal', () => {
    component.abrirModalUsuario();
    preencherUsuario();
    component.salvarUsuario();

    api.expectOne(`${API}/auth/cadastrar`).flush({});

    expect(avisos.avisos()[0]).toEqual(expect.objectContaining({ tipo: 'sucesso', texto: 'Usuário cadastrado.' }));
    expect(component.modalUsuario()).toBe(false);
  });

  it('CPF vai para a API só com dígitos', () => {
    preencherUsuario();
    component.salvarUsuario();

    const req = api.expectOne(`${API}/auth/cadastrar`);
    expect(req.request.body.cpf).toBe('52998224725');
    req.flush({});
  });

  it('modo testes: CPF com 11 números passa mesmo com dígito errado', () => {
    preencherUsuario();
    component.novoUsuario.cpf = '529.982.247-24';
    component.salvarUsuario();

    expect(pedidosCadastro().length).toBe(1);
  });

  it('CPF sem 11 números não chama a API e avisa', () => {
    preencherUsuario();
    component.novoUsuario.cpf = '529.982.247';
    component.salvarUsuario();

    expect(pedidosCadastro().length).toBe(0);
    expect(avisos.avisos()[0].texto).toBe('O CPF precisa ter 11 números.');
  });

  it('campo obrigatório vazio avisa em vez de falhar em silêncio', () => {
    preencherUsuario();
    component.novoUsuario.login = '  ';
    component.salvarUsuario();

    expect(pedidosCadastro().length).toBe(0);
    expect(avisos.avisos()[0].texto).toContain('Preencha os campos obrigatórios');
  });

  it('tipos de veículo vêm da API', () => {
    api.expectOne(`${API}/tipos-veiculo`).flush([{ id: 'uuid-1', nome: 'Caminhão', medidor: 'hodometro' }]);
    expect(component.tiposVeiculo()).toEqual([{ id: 'uuid-1', nome: 'Caminhão', medidor: 'hodometro' }]);
  });

  it('cadastro de veículo exige o tipo; na edição vai tipoId "" (a API ignora)', () => {
    component.abrirModalVeiculo();
    component.novoVeiculo.descricao = 'Caminhão Basculante';
    component.salvarVeiculo();
    expect(api.match(`${API}/veiculos`).filter(r => r.request.method === 'POST').length).toBe(0);
    expect(avisos.avisos()[0].texto).toBe('Escolha o tipo do veículo.');

    const existente: VeiculoResponse = {
      id: 'v1', tipoNome: 'Caminhão', tipoMedidor: 'hodometro', placa: 'ABC1D23', descricao: 'Caminhão 1',
      status: 'disponivel', medidorAtual: 100, marca: null, modelo: null, ano: null, cor: null,
      renavam: null, chassi: null, comboio: false,
    };
    component.abrirModalVeiculo(existente);
    component.salvarVeiculo();
    const put = api.expectOne(`${API}/veiculos/v1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.tipoId).toBe('');
    put.flush(null);
  });

  it('medidor negativo é recusado', () => {
    component.abrirModalVeiculo();
    component.novoVeiculo = { ...component.resetVeiculo(), tipoId: 'uuid-1', descricao: 'X', medidorAtual: -5 };
    component.salvarVeiculo();

    expect(api.match(r => r.method === 'POST' && r.url === `${API}/veiculos`).length).toBe(0);
    expect(avisos.avisos()[0].texto).toBe('O medidor não pode ser negativo.');
  });

  describe('placa e reativação de veículo', () => {
    const inativo: VeiculoResponse = {
      id: 'v9', tipoNome: 'Caminhão', tipoMedidor: 'hodometro', placa: 'ABC1D23', descricao: 'Caminhão Velho',
      status: 'inativo', medidorAtual: 100, marca: null, modelo: null, ano: null, cor: null,
      renavam: null, chassi: null, comboio: false,
    };
    const novo = () => ({ ...component.resetVeiculo(), tipoId: 'uuid-1', descricao: 'Caminhão Novo', placa: 'abc-1d23' });
    const postVeiculo = () => api.expectOne(r => r.method === 'POST' && r.url === `${API}/veiculos`);
    const putAtivo = () => api.match(r => r.method === 'PUT' && r.url === `${API}/veiculos/v9/ativo`);

    beforeEach(() => component.veiculos.set([inativo]));
    afterEach(() => vi.restoreAllMocks());

    it('placa vai normalizada (maiúsculas, sem hífen e sem espaço)', () => {
      component.abrirModalVeiculo();
      component.novoVeiculo = novo();
      component.salvarVeiculo();
      const req = postVeiculo();
      expect(req.request.body.placa).toBe('ABC1D23');
      req.flush(null);
    });

    it('botão Reativar: confirma e envia { ativo: true }', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.reativarVeiculo(inativo);
      const req = putAtivo()[0];
      expect(req.request.body).toEqual({ ativo: true });
      req.flush(null);
      expect(avisos.avisos()[0]).toEqual(expect.objectContaining({ tipo: 'sucesso', texto: 'Veículo reativado.' }));
    });

    it('reativar com placa já usada por outro ativo (400) mostra o erro da API', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.reativarVeiculo(inativo);
      putAtivo()[0].flush({ erro: 'Outro veículo ativo já usa esta placa.' }, { status: 400, statusText: 'Bad Request' });
      expect(avisos.avisos()[0].texto).toBe('Outro veículo ativo já usa esta placa.');
    });

    it('409 PLACA_DE_VEICULO_INATIVO: oferece reativar o veículo inativo dessa placa', () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.abrirModalVeiculo();
      component.novoVeiculo = novo();
      component.salvarVeiculo();
      postVeiculo().flush({ erro: 'Placa de veículo inativo.', codigo: 'PLACA_DE_VEICULO_INATIVO' }, { status: 409, statusText: 'Conflict' });

      expect(confirmar.mock.calls[0][0]).toContain('Caminhão Velho');
      expect(component.modalVeiculo()).toBe(false);
      expect(putAtivo().length).toBe(1);
    });

    it('409 PLACA_DE_VEICULO_INATIVO recusado: não reativa e o modal continua aberto', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.abrirModalVeiculo();
      component.novoVeiculo = novo();
      component.salvarVeiculo();
      postVeiculo().flush({ erro: 'Placa de veículo inativo.', codigo: 'PLACA_DE_VEICULO_INATIVO' }, { status: 409, statusText: 'Conflict' });

      expect(putAtivo().length).toBe(0);
      expect(component.modalVeiculo()).toBe(true);
    });

    it('409 PLACA_EM_USO mostra o erro da API e mantém o modal aberto', () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.abrirModalVeiculo();
      component.novoVeiculo = novo();
      component.salvarVeiculo();
      postVeiculo().flush({ erro: 'Placa já cadastrada em outro veículo.', codigo: 'PLACA_EM_USO' }, { status: 409, statusText: 'Conflict' });

      expect(confirmar).not.toHaveBeenCalled();
      expect(avisos.avisos()[0].texto).toBe('Placa já cadastrada em outro veículo.');
      expect(component.modalVeiculo()).toBe(true);
    });
  });

  it('erro ao carregar a aba de usuários fica separado da lista vazia', () => {
    api.match(`${API}/usuarios`)[0].flush(null, { status: 503, statusText: 'Indisponível' });

    expect(component.erroUsuarios()).toBe('O servidor está iniciando. Aguarde cerca de 1 minuto e tente de novo.');
  });
});
