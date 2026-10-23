import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AbastecimentoDetalhado, AbastecimentoDoDiario } from '../interfaces/abastecimento';

@Injectable({
  providedIn: 'root'
})
export class AbastecimentoService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarAbastecimentos(): Observable<AbastecimentoDetalhado[]> {
    return this.http.get<AbastecimentoDetalhado[]>(`${this.apiUrl}/abastecimentos`);
  }

  listarAbastecimentosPorMotorista(login: string): Observable<AbastecimentoDetalhado[]> {
    return this.http.get<AbastecimentoDetalhado[]>(`${this.apiUrl}/abastecimentos/motorista/${login}`);
  }

  listarAbastecimentosPorVeiculo(veiculoId: string): Observable<AbastecimentoDetalhado[]> {
    return this.http.get<AbastecimentoDetalhado[]>(`${this.apiUrl}/abastecimentos/veiculo/${veiculoId}`);
  }

  listarAbastecimentosPorDiario(diarioId: string): Observable<AbastecimentoDoDiario[]> {
    return this.http.get<AbastecimentoDoDiario[]>(`${this.apiUrl}/abastecimentos/diario/${diarioId}`);
  }
}
