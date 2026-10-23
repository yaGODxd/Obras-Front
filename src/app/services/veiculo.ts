import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MotoristasDoVeiculo, TipoVeiculo, VeiculoEmUso, VeiculoRequest, VeiculoResponse } from '../interfaces/veiculo';

@Injectable({
  providedIn: 'root'
})
export class VeiculoService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarVeiculos(): Observable<VeiculoResponse[]> {
    return this.http.get<VeiculoResponse[]>(`${this.apiUrl}/veiculos`);
  }

  buscarVeiculo(id: string): Observable<VeiculoResponse> {
    return this.http.get<VeiculoResponse>(`${this.apiUrl}/veiculos/${id}`);
  }

  listarVeiculosEmUso(): Observable<VeiculoEmUso[]> {
    return this.http.get<VeiculoEmUso[]>(`${this.apiUrl}/veiculos/em-uso`);
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

  // Volta como "disponivel". 400 se outro veículo ativo já usa a mesma placa.
  reativarVeiculo(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/veiculos/${id}/ativo`, { ativo: true });
  }

  buscarMotoristasVeiculo(veiculoId: string): Observable<MotoristasDoVeiculo> {
    return this.http.get<MotoristasDoVeiculo>(`${this.apiUrl}/veiculos/${veiculoId}/motoristas`);
  }
}
