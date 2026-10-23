import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DiarioResponse, DiarioResumoMensal, VerificacaoDiario } from '../interfaces/diario';
import { montarParams } from '../shared/utils/params';

@Injectable({
  providedIn: 'root'
})
export class DiarioService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarDiarios(veiculoId?: string, mes?: number, ano?: number): Observable<DiarioResponse[]> {
    const params = montarParams({ veiculoId, mes, ano });
    return this.http.get<DiarioResponse[]>(`${this.apiUrl}/diarios`, { params });
  }

  listarResumoMensal(veiculoId?: string, mes?: number, ano?: number): Observable<DiarioResumoMensal[]> {
    const params = montarParams({ veiculoId, mes, ano });
    return this.http.get<DiarioResumoMensal[]>(`${this.apiUrl}/diarios/resumo-mensal`, { params });
  }

  buscarDiarioAberto(login: string): Observable<DiarioResponse> {
    return this.http.get<DiarioResponse>(`${this.apiUrl}/diarios/aberto/${login}`);
  }

  verificarDiario(id: string): Observable<VerificacaoDiario> {
    return this.http.get<VerificacaoDiario>(`${this.apiUrl}/diarios/${id}/verificar`);
  }
}
