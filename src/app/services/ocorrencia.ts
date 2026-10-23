import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OcorrenciaDetalhada, OcorrenciaDoDiario, StatusOcorrencia } from '../interfaces/ocorrencia';

@Injectable({
  providedIn: 'root'
})
export class OcorrenciaService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarOcorrencias(): Observable<OcorrenciaDetalhada[]> {
    return this.http.get<OcorrenciaDetalhada[]>(`${this.apiUrl}/ocorrencias`);
  }

  listarOcorrenciasPorMotorista(login: string): Observable<OcorrenciaDetalhada[]> {
    return this.http.get<OcorrenciaDetalhada[]>(`${this.apiUrl}/ocorrencias/motorista/${login}`);
  }

  listarOcorrenciasPorVeiculo(veiculoId: string): Observable<OcorrenciaDetalhada[]> {
    return this.http.get<OcorrenciaDetalhada[]>(`${this.apiUrl}/ocorrencias/veiculo/${veiculoId}`);
  }

  listarOcorrenciasPorDiario(diarioId: string): Observable<OcorrenciaDoDiario[]> {
    return this.http.get<OcorrenciaDoDiario[]>(`${this.apiUrl}/ocorrencias/diario/${diarioId}`);
  }

  // Mudança manual pelo gestor. O status também muda sozinho com as manutenções ligadas.
  alterarStatus(id: string, status: StatusOcorrencia): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/ocorrencias/${id}/status`, { status });
  }
}
