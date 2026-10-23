import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AtualizarStatusRequest, ManutencaoRequest, ManutencaoResponse, PecaRequest } from '../interfaces/manutencao';

@Injectable({
  providedIn: 'root'
})
export class ManutencaoService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

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

  // 409 se a manutenção já está concluída (sem código, com {"erro"}).
  editarPeca(pecaId: string, request: PecaRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/manutencoes/pecas/${pecaId}`, request);
  }
}
