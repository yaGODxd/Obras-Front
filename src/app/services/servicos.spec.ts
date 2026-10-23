import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AbastecimentoService } from './abastecimento';
import { CadastrosService } from './cadastros';
import { ChecklistService } from './checklist';
import { DiarioService } from './diario';
import { FotoService } from './foto';
import { LogService } from './log';
import { ManutencaoService } from './manutencao';
import { OcorrenciaService } from './ocorrencia';
import { RastreamentoService } from './rastreamento';
import { UsuarioService } from './usuario';
import { VeiculoService } from './veiculo';
import { VeiculoRequest } from '../interfaces/veiculo';
import { ManutencaoRequest } from '../interfaces/manutencao';

const API = environment.apiUrl;
const veiculo: VeiculoRequest = { tipoId: 't1', descricao: 'Caminhão' };
const manutencao: ManutencaoRequest = { veiculoId: 'v1', tipo: 'corretiva', descricao: 'Freio' };

// Cada chamada da API depois da divisão do antigo UsuarioService (8.1): método HTTP e endereço iguais aos de antes.
type Caso = [string, () => Observable<unknown>, string, string];

describe('serviços da API (divisão do UsuarioService)', () => {
  let api: HttpTestingController;
  const s = <T>(classe: new (...args: never[]) => T): T => TestBed.inject(classe);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(HttpTestingController);
  });

  afterEach(() => api.verify());

  const casos: Caso[] = [
    ['listarVeiculos', () => s(VeiculoService).listarVeiculos(), 'GET', '/veiculos'],
    ['buscarVeiculo', () => s(VeiculoService).buscarVeiculo('v1'), 'GET', '/veiculos/v1'],
    ['listarVeiculosEmUso', () => s(VeiculoService).listarVeiculosEmUso(), 'GET', '/veiculos/em-uso'],
    ['listarTiposVeiculo', () => s(VeiculoService).listarTiposVeiculo(), 'GET', '/tipos-veiculo'],
    ['cadastrarVeiculo', () => s(VeiculoService).cadastrarVeiculo(veiculo), 'POST', '/veiculos'],
    ['atualizarVeiculo', () => s(VeiculoService).atualizarVeiculo('v1', veiculo), 'PUT', '/veiculos/v1'],
    ['inativarVeiculo', () => s(VeiculoService).inativarVeiculo('v1'), 'DELETE', '/veiculos/v1'],
    ['reativarVeiculo', () => s(VeiculoService).reativarVeiculo('v1'), 'PUT', '/veiculos/v1/ativo'],
    ['buscarMotoristasVeiculo', () => s(VeiculoService).buscarMotoristasVeiculo('v1'), 'GET', '/veiculos/v1/motoristas'],

    ['listarDiarios', () => s(DiarioService).listarDiarios(), 'GET', '/diarios'],
    ['listarResumoMensal', () => s(DiarioService).listarResumoMensal(), 'GET', '/diarios/resumo-mensal'],
    ['buscarDiarioAberto', () => s(DiarioService).buscarDiarioAberto('joao'), 'GET', '/diarios/aberto/joao'],
    ['verificarDiario', () => s(DiarioService).verificarDiario('d1'), 'GET', '/diarios/d1/verificar'],

    ['listarPosicoesAtuais', () => s(RastreamentoService).listarPosicoesAtuais(), 'GET', '/rastreamento/posicoes'],
    ['buscarPontosDiario', () => s(RastreamentoService).buscarPontosDiario('d1'), 'GET', '/rastreamento/diario/d1'],

    ['listarAbastecimentos', () => s(AbastecimentoService).listarAbastecimentos(), 'GET', '/abastecimentos'],
    ['listarAbastecimentosPorMotorista', () => s(AbastecimentoService).listarAbastecimentosPorMotorista('joao'), 'GET', '/abastecimentos/motorista/joao'],
    ['listarAbastecimentosPorVeiculo', () => s(AbastecimentoService).listarAbastecimentosPorVeiculo('v1'), 'GET', '/abastecimentos/veiculo/v1'],
    ['listarAbastecimentosPorDiario', () => s(AbastecimentoService).listarAbastecimentosPorDiario('d1'), 'GET', '/abastecimentos/diario/d1'],

    ['listarOcorrencias', () => s(OcorrenciaService).listarOcorrencias(), 'GET', '/ocorrencias'],
    ['listarOcorrenciasPorMotorista', () => s(OcorrenciaService).listarOcorrenciasPorMotorista('joao'), 'GET', '/ocorrencias/motorista/joao'],
    ['listarOcorrenciasPorVeiculo', () => s(OcorrenciaService).listarOcorrenciasPorVeiculo('v1'), 'GET', '/ocorrencias/veiculo/v1'],
    ['listarOcorrenciasPorDiario', () => s(OcorrenciaService).listarOcorrenciasPorDiario('d1'), 'GET', '/ocorrencias/diario/d1'],
    ['alterarStatus', () => s(OcorrenciaService).alterarStatus('o1', 'resolvida'), 'PUT', '/ocorrencias/o1/status'],

    ['listarManutencoes', () => s(ManutencaoService).listarManutencoes(), 'GET', '/manutencoes'],
    ['listarManutencoesAbertas', () => s(ManutencaoService).listarManutencoesAbertas(), 'GET', '/manutencoes/abertas'],
    ['listarManutencoesPorVeiculo', () => s(ManutencaoService).listarManutencoesPorVeiculo('v1'), 'GET', '/manutencoes/veiculo/v1'],
    ['buscarManutencao', () => s(ManutencaoService).buscarManutencao('m1'), 'GET', '/manutencoes/m1'],
    ['abrirManutencao', () => s(ManutencaoService).abrirManutencao(manutencao), 'POST', '/manutencoes'],
    ['atualizarStatusManutencao', () => s(ManutencaoService).atualizarStatusManutencao('m1', { status: 'concluida' }), 'PUT', '/manutencoes/m1/status'],
    ['editarPeca', () => s(ManutencaoService).editarPeca('p1', { nomePeca: 'Filtro', quantidade: 1, valorUnitario: 10 }), 'PUT', '/manutencoes/pecas/p1'],

    ['listarMecanicos', () => s(CadastrosService).listarMecanicos(), 'GET', '/mecanicos'],
    ['criarMecanico', () => s(CadastrosService).criarMecanico({ nome: 'Zé' }), 'POST', '/mecanicos'],
    ['atualizarMecanico', () => s(CadastrosService).atualizarMecanico('k1', { nome: 'Zé' }), 'PUT', '/mecanicos/k1'],
    ['alterarAtivoMecanico', () => s(CadastrosService).alterarAtivoMecanico('k1', false), 'PUT', '/mecanicos/k1/ativo'],
    ['listarPostos', () => s(CadastrosService).listarPostos(), 'GET', '/postos'],
    ['criarPosto', () => s(CadastrosService).criarPosto({ nome: 'Posto' }), 'POST', '/postos'],
    ['atualizarPosto', () => s(CadastrosService).atualizarPosto('p1', { nome: 'Posto' }), 'PUT', '/postos/p1'],
    ['alterarAtivoPosto', () => s(CadastrosService).alterarAtivoPosto('p1', true), 'PUT', '/postos/p1/ativo'],

    ['listarTemplates', () => s(ChecklistService).listarTemplates(), 'GET', '/checklist/templates'],
    ['adicionarItemChecklist', () => s(ChecklistService).adicionarItemChecklist({ templateId: 't1', descricao: 'Pneus', obrigatorio: true, ordem: 1 }), 'POST', '/checklist/itens'],
    ['alterarAtivoItemChecklist', () => s(ChecklistService).alterarAtivoItemChecklist('i1', false), 'PUT', '/checklist/itens/i1/ativo'],
    ['buscarRespostasChecklist', () => s(ChecklistService).buscarRespostasChecklist('d1'), 'GET', '/checklist/respostas/diario/d1'],

    ['listarLogs', () => s(LogService).listarLogs(), 'GET', '/logs'],

    ['listarUsuarios', () => s(UsuarioService).listarUsuarios(), 'GET', '/usuarios'],
    ['buscarPerfil', () => s(UsuarioService).buscarPerfil('joao'), 'GET', '/usuarios/joao'],
    ['criarUsuario', () => s(UsuarioService).criarUsuario({ nomeCompleto: 'João', cpf: '1', login: 'joao', senha: 'x', perfil: 'motorista' }), 'POST', '/auth/cadastrar'],
    ['atualizarUsuario', () => s(UsuarioService).atualizarUsuario('joao', {}), 'PUT', '/usuarios/joao'],
    ['atualizarPerfil', () => s(UsuarioService).atualizarPerfil('joao', { nomeCompleto: 'João', fotoPerfil: null }), 'PUT', '/usuarios/joao/perfil'],
    ['alterarAtivo', () => s(UsuarioService).alterarAtivo('joao', false), 'PUT', '/usuarios/joao/ativo'],
    ['listarMotoristasOnline', () => s(UsuarioService).listarMotoristasOnline(), 'GET', '/usuarios/motoristas/online'],
    ['listarSecretarias', () => s(UsuarioService).listarSecretarias(), 'GET', '/secretarias'],
    ['listarFotosDoDiario', () => s(FotoService).listarFotosDoDiario('d1'), 'GET', '/diarios/d1/fotos'],
    ['usoFotos', () => s(FotoService).usoFotos(), 'GET', '/fotos/uso'],
  ];

  it.each(casos)('%s → %s %s', (_nome, chamar, metodo, caminho) => {
    chamar().subscribe();
    const req = api.expectOne(r => r.url === `${API}${caminho}`);
    expect(req.request.method).toBe(metodo);
    req.flush(null);
  });

  it('foto: GET /fotos/{id} vem como blob (a imagem não passa pelo conversor de datas)', () => {
    let recebido: Blob | undefined;
    s(FotoService).baixarFoto('f1').subscribe(b => (recebido = b));
    const req = api.expectOne(`${API}/fotos/f1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x'], { type: 'image/jpeg' }));
    expect(recebido).toBeInstanceOf(Blob);
  });

  it('logs: codifica os parâmetros da URL (espaço, & e acento)', () => {
    s(LogService).listarLogs('joão silva', 'A&B').subscribe();

    const req = api.expectOne(r => r.url === `${API}/logs`);
    expect(req.request.params.get('login')).toBe('joão silva');
    expect(req.request.urlWithParams).toContain('acao=A%26B');
    req.flush([]);
  });

  it('diários: não envia parâmetros vazios ou 0 (como antes)', () => {
    s(DiarioService).listarDiarios('', 0, 2026).subscribe();

    const req = api.expectOne(r => r.url === `${API}/diarios`);
    expect(req.request.params.keys()).toEqual(['ano']);
    req.flush([]);
  });
});
