import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';


export interface MotoristaOnline {
  id: string;
  nomeCompleto: string;
  login: string;
  fotoPerfil: string | null;
  turnoAbertoEm: string | null;
}

export interface VeiculoEmUso {
  id: string;
  tipoNome: string;
  placa: string | null;
  descricao: string;
  medidorAtual: number;
  motoristaId: string;
  motoristaNome: string;
  motoristaLogin: string;
  diarioAbertoEm: string | null;
}

export interface DiarioAberto {
  id: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  motoristaNome: string;
  medidorInicial: number;
  medidorFinal: number | null;
  medidorPercorrido: number | null;
  destino: string | null;
  status: string;
  abertoEm: string | null;
  fechadoEm: string | null;
}

// Atualizado: campos novos vindos do endpoint /rastreamento/posicoes
export interface UltimaPosicao {
  diarioId: string;
  login: string;
  nomeCompleto: string;
  latitude: number;
  longitude: number;
  registradoEm: string | null;
  veiculoDescricao: string | null;
  veiculoPlaca: string | null;
  destino: string | null;
}

export interface PontoRastreamento {
  id: string;
  diarioId: string;
  latitude: number;
  longitude: number;
  velocidade: number | null;
  registradoEm: string | null;
}

export interface AbastecimentoDetalhado {
  id: string;
  tipoCombustivel: string;
  litros: number;
  valorTotal: number;
  posto: string | null;
  registradoEm: string | null;
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  motoristaLogin: string;
  motoristaNome: string;
  motoristaFoto: string | null;
  veiculoAbastecidoId: string | null;
  veiculoAbastecidoDescricao: string | null;
}

export interface OcorrenciaDetalhada {
  id: string;
  diarioId: string;
  tipo: string;
  descricao: string;
  latitude: number | null;
  longitude: number | null;
  registradoEm: string | null;
  motoristaLogin: string;
  motoristaNome: string;
  motoristaFoto: string | null;
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
}

export interface VeiculoResponse {
  id: string;
  tipoNome: string;
  tipoMedidor: string;
  placa: string | null;
  descricao: string;
  status: string;
  medidorAtual: number;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
  renavam: string | null;
  chassi: string | null;
  comboio: boolean;
}

export interface PecaResponse {
  id: string;
  nomePeca: string;
  codigoPeca: string | null;
  marcaPeca: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface ManutencaoResponse {
  id: string;
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  ocorrenciaId: string | null;
  tipo: string;
  descricao: string;
  mecanicoResponsavel: string | null;
  oficina: string | null;
  custoMaoObra: number;
  custoPecas: number;
  custoTotal: number;
  status: string;
  abertaEm: string | null;
  concluidaEm: string | null;
  observacoes: string | null;
  fotoNotaFiscal: string | null;
  pecas: PecaResponse[];
}

export interface ManutencaoRequest {
  veiculoId: string;
  ocorrenciaId?: string | null;
  tipo: string;
  descricao: string;
  mecanicoResponsavel?: string | null;
  oficina?: string | null;
  custoMaoObra?: number;
  observacoes?: string | null;
  fotoNotaFiscal?: string | null;
  pecas?: PecaRequest[];
}

export interface PecaRequest {
  nomePeca: string;
  codigoPeca?: string | null;
  marcaPeca?: string | null;
  quantidade: number;
  valorUnitario: number;
}

export interface AtualizarStatusRequest {
  status: string;
  observacoes?: string | null;
}

export interface LogResponse {
  id: string;
  usuarioLogin: string;
  usuarioNome: string | null;
  usuarioFoto: string | null;
  acao: string;
  descricao: string;
  ip: string | null;
  criadoEm: string | null;
}

export interface DiarioResponse {
  id: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  motoristaNome: string;
  medidorInicial: number;
  medidorFinal: number | null;
  medidorPercorrido: number | null;
  destino: string | null;
  status: string;
  abertoEm: string | null;
  fechadoEm: string | null;
}

export interface DiarioResumoMensal {
  veiculoId: string;
  veiculoDescricao: string;
  veiculoPlaca: string | null;
  mes: number;
  ano: number;
  totalDiarios: number;
  primeiroMedidor: number;
  ultimoMedidor: number;
  totalPercorrido: number;
}

export interface UsuarioResponse {
  id: string;
  nomeCompleto: string;
  login: string;
  perfil: string;
  fotoPerfil: string | null;
  ativo: boolean;
  matricula: string | null;
  vinculo: string | null;
  secretariaId: number | null;
  secretariaNome: string | null;
  categoriaCnh: string | null;
  validadeCnh: string | null;
  telefone: string | null;
}

export interface CriarUsuarioRequest {
  nomeCompleto: string;
  cpf: string;
  login: string;
  senha: string;
  perfil: string;
  matricula?: string | null;
  vinculo?: string | null;
  secretariaId?: number | null;
  categoriaCnh?: string | null;
  validadeCnh?: string | null;
  telefone?: string | null;
}

export interface TipoVeiculo {
  id: string;
  nome: string;
  medidor: string;
}

export interface VeiculoRequest {
  tipoId: string;
  placa?: string | null;
  descricao: string;
  medidorAtual?: number;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  cor?: string | null;
  renavam?: string | null;
  chassi?: string | null;
  comboio?: boolean;
}

export interface SecretariaResponse {
  id: number;
  nome: string;
}

export interface AtualizarUsuarioRequest {
  nomeCompleto?: string | null;
  fotoPerfil?: string | null;
  matricula?: string | null;
  vinculo?: string | null;
  secretariaId?: number | null;
  categoriaCnh?: string | null;
  validadeCnh?: string | null;
  telefone?: string | null;
}

export interface MecanicoResponse {
  id: string;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
  ativo: boolean;
}

export interface MecanicoRequest {
  nome: string;
  telefone?: string | null;
  especialidade?: string | null;
}

export interface PostoResponse {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  ativo: boolean;
}

export interface PostoRequest {
  nome: string;
  endereco?: string | null;
  cidade?: string | null;
}

export interface MotoristaVeiculoInfo {
  id: string;
  nomeCompleto: string;
  login: string;
  fotoPerfil: string | null;
  totalUsos?: number;
  ultimoUso?: string | null;
}

export interface ChecklistTemplateResponse {
  id: string;
  nome: string;
  ativo: boolean;
  itens: ChecklistItemResponse[];
}

export interface ChecklistItemResponse {
  id: string;
  templateId: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
}

export interface ChecklistItemRequest {
  templateId: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
}

export interface ChecklistRespostaResponse {
  id: string;
  itemId: string;
  descricao: string;
  obrigatorio: boolean;
  ok: boolean;
  observacao: string | null;
  registradoEm: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = 'https://sistema-obras-api.onrender.com';

  constructor(private http: HttpClient) {}

  listarMotoristasOnline(): Observable<MotoristaOnline[]> {
    return this.http.get<MotoristaOnline[]>(`${this.apiUrl}/usuarios/motoristas/online`).pipe(
      tap(data => console.log('Motoristas:', data))
    );
  }

  listarVeiculosEmUso(): Observable<VeiculoEmUso[]> {
    return this.http.get<VeiculoEmUso[]>(`${this.apiUrl}/veiculos/em-uso`).pipe(
      tap(data => console.log('Veículos:', data))
    );
  }

  buscarDiarioAberto(login: string): Observable<DiarioAberto> {
    return this.http.get<DiarioAberto>(`${this.apiUrl}/diarios/aberto/${login}`);
  }

  // Renomeado de buscarUltimasPosicoes → listarPosicoesAtuais
  // para alinhar com o dashboard.ts que chama este método
  listarPosicoesAtuais(): Observable<UltimaPosicao[]> {
    return this.http.get<UltimaPosicao[]>(`${this.apiUrl}/rastreamento/posicoes`);
  }

  buscarPontosDiario(diarioId: string): Observable<PontoRastreamento[]> {
    return this.http.get<PontoRastreamento[]>(`${this.apiUrl}/rastreamento/diario/${diarioId}`);
  }

  listarAbastecimentos(): Observable<AbastecimentoDetalhado[]> {
    return this.http.get<AbastecimentoDetalhado[]>(`${this.apiUrl}/abastecimentos`);
  }

  listarAbastecimentosPorMotorista(login: string): Observable<AbastecimentoDetalhado[]> {
    return this.http.get<AbastecimentoDetalhado[]>(`${this.apiUrl}/abastecimentos/motorista/${login}`);
  }

  listarAbastecimentosPorVeiculo(veiculoId: string): Observable<AbastecimentoDetalhado[]> {
    return this.http.get<AbastecimentoDetalhado[]>(`${this.apiUrl}/abastecimentos/veiculo/${veiculoId}`);
  }

  listarOcorrencias(): Observable<OcorrenciaDetalhada[]> {
    return this.http.get<OcorrenciaDetalhada[]>(`${this.apiUrl}/ocorrencias`);
  }

  listarOcorrenciasPorMotorista(login: string): Observable<OcorrenciaDetalhada[]> {
    return this.http.get<OcorrenciaDetalhada[]>(`${this.apiUrl}/ocorrencias/motorista/${login}`);
  }

  listarOcorrenciasPorVeiculo(veiculoId: string): Observable<OcorrenciaDetalhada[]> {
    return this.http.get<OcorrenciaDetalhada[]>(`${this.apiUrl}/ocorrencias/veiculo/${veiculoId}`);
  }

  listarVeiculos(): Observable<VeiculoResponse[]> {
    return this.http.get<VeiculoResponse[]>(`${this.apiUrl}/veiculos`);
  }

  buscarVeiculo(id: string): Observable<VeiculoResponse> {
    return this.http.get<VeiculoResponse>(`${this.apiUrl}/veiculos/${id}`);
  }

  listarManutencoes(): Observable<ManutencaoResponse[]> {
    return this.http.get<ManutencaoResponse[]>(`${this.apiUrl}/manutencoes`);
  }

  listarManutencoesAbertas(): Observable<ManutencaoResponse[]> {
    return this.http.get<ManutencaoResponse[]>(`${this.apiUrl}/manutencoes/abertas`);
  }

  listarManutencoesPorVeiculo(veiculoId: string): Observable<ManutencaoResponse[]> {
    return this.http.get<ManutencaoResponse[]>(`${this.apiUrl}/manutencoes/veiculo/${veiculoId}`);
  }

  buscarManutencao(id: string): Observable<ManutencaoResponse> {
    return this.http.get<ManutencaoResponse>(`${this.apiUrl}/manutencoes/${id}`);
  }

  abrirManutencao(request: ManutencaoRequest): Observable<ManutencaoResponse> {
    return this.http.post<ManutencaoResponse>(`${this.apiUrl}/manutencoes`, request);
  }

  atualizarStatusManutencao(id: string, request: AtualizarStatusRequest): Observable<ManutencaoResponse> {
    return this.http.put<ManutencaoResponse>(`${this.apiUrl}/manutencoes/${id}/status`, request);
  }

  adicionarPeca(manutencaoId: string, request: PecaRequest): Observable<PecaResponse> {
    return this.http.post<PecaResponse>(`${this.apiUrl}/manutencoes/${manutencaoId}/pecas`, request);
  }

  removerPeca(pecaId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/manutencoes/pecas/${pecaId}`);
  }

  listarLogs(login?: string, acao?: string, inicio?: string, fim?: string): Observable<LogResponse[]> {
    const query: string[] = [];
    if (login) query.push(`login=${login}`);
    if (acao) query.push(`acao=${acao}`);
    if (inicio) query.push(`inicio=${inicio}`);
    if (fim) query.push(`fim=${fim}`);
    const params = query.length > 0 ? '?' + query.join('&') : '';
    return this.http.get<LogResponse[]>(`${this.apiUrl}/logs${params}`);
  }

  listarDiarios(veiculoId?: string, mes?: number, ano?: number): Observable<DiarioResponse[]> {
    const query: string[] = [];
    if (veiculoId) query.push(`veiculoId=${veiculoId}`);
    if (mes) query.push(`mes=${mes}`);
    if (ano) query.push(`ano=${ano}`);
    const params = query.length > 0 ? '?' + query.join('&') : '';
    return this.http.get<DiarioResponse[]>(`${this.apiUrl}/diarios${params}`);
  }

  listarResumoMensal(veiculoId?: string, mes?: number, ano?: number): Observable<DiarioResumoMensal[]> {
    const query: string[] = [];
    if (veiculoId) query.push(`veiculoId=${veiculoId}`);
    if (mes) query.push(`mes=${mes}`);
    if (ano) query.push(`ano=${ano}`);
    const params = query.length > 0 ? '?' + query.join('&') : '';
    return this.http.get<DiarioResumoMensal[]>(`${this.apiUrl}/diarios/resumo-mensal${params}`);
  }

  listarUsuarios(): Observable<UsuarioResponse[]> {
    return this.http.get<UsuarioResponse[]>(`${this.apiUrl}/usuarios`);
  }

  criarUsuario(request: CriarUsuarioRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/cadastrar`, request);
  }

  alterarAtivo(login: string, ativo: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/usuarios/${login}/ativo`, { ativo });
  }

  listarTiposVeiculo(): Observable<TipoVeiculo[]> {
    return this.http.get<TipoVeiculo[]>(`${this.apiUrl}/tipos-veiculo`);
  }

  cadastrarVeiculo(request: VeiculoRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/veiculos`, request);
  }

  atualizarVeiculo(id: string, request: VeiculoRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/veiculos/${id}`, request);
  }

  inativarVeiculo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/veiculos/${id}`);
  }

  buscarPerfil(login: string): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/usuarios/${login}`);
  }

  getFotoUrl(foto: string | null): string | null {
    if (!foto) return null;
    return 'data:image/jpeg;base64,' + foto;
  }

  listarSecretarias(): Observable<SecretariaResponse[]> {
    return this.http.get<SecretariaResponse[]>(`${this.apiUrl}/secretarias`);
  }

  atualizarUsuario(login: string, request: AtualizarUsuarioRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/usuarios/${login}`, request);
  }

  listarComboios(): Observable<VeiculoResponse[]> {
    return this.http.get<VeiculoResponse[]>(`${this.apiUrl}/veiculos/comboios`);
  }

  listarMecanicos(): Observable<MecanicoResponse[]> {
    return this.http.get<MecanicoResponse[]>(`${this.apiUrl}/mecanicos`);
  }

  criarMecanico(request: MecanicoRequest): Observable<MecanicoResponse> {
    return this.http.post<MecanicoResponse>(`${this.apiUrl}/mecanicos`, request);
  }

  atualizarMecanico(id: string, request: MecanicoRequest): Observable<MecanicoResponse> {
    return this.http.put<MecanicoResponse>(`${this.apiUrl}/mecanicos/${id}`, request);
  }

  alterarAtivoMecanico(id: string, ativo: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mecanicos/${id}/ativo`, { ativo });
  }

  listarPostos(): Observable<PostoResponse[]> {
    return this.http.get<PostoResponse[]>(`${this.apiUrl}/postos`);
  }

  criarPosto(request: PostoRequest): Observable<PostoResponse> {
    return this.http.post<PostoResponse>(`${this.apiUrl}/postos`, request);
  }

  atualizarPosto(id: string, request: PostoRequest): Observable<PostoResponse> {
    return this.http.put<PostoResponse>(`${this.apiUrl}/postos/${id}`, request);
  }

  alterarAtivoPosto(id: string, ativo: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/postos/${id}/ativo`, { ativo });
  }

  buscarMotoristasVeiculo(veiculoId: string): Observable<{ maisUsou: MotoristaVeiculoInfo | null, ultimo: MotoristaVeiculoInfo | null }> {
    return this.http.get<any>(`${this.apiUrl}/veiculos/${veiculoId}/motoristas`);
  }

  buscarTemplateAtivo(): Observable<ChecklistTemplateResponse> {
    return this.http.get<ChecklistTemplateResponse>(`${this.apiUrl}/checklist/ativo`);
  }

  listarTemplates(): Observable<ChecklistTemplateResponse[]> {
    return this.http.get<ChecklistTemplateResponse[]>(`${this.apiUrl}/checklist/templates`);
  }

  adicionarItemChecklist(request: ChecklistItemRequest): Observable<ChecklistItemResponse> {
    return this.http.post<ChecklistItemResponse>(`${this.apiUrl}/checklist/itens`, request);
  }

  alterarAtivoItemChecklist(id: string, ativo: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/checklist/itens/${id}/ativo`, { ativo });
  }

  buscarRespostasChecklist(diarioId: string): Observable<ChecklistRespostaResponse[]> {
    return this.http.get<ChecklistRespostaResponse[]>(`${this.apiUrl}/checklist/respostas/diario/${diarioId}`);
  }
}