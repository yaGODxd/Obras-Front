import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PontoRastreamento, UltimaPosicao } from '../interfaces/rastreamento';

@Injectable({
  providedIn: 'root'
})
export class RastreamentoService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarPosicoesAtuais(): Observable<UltimaPosicao[]> {
    return this.http.get<UltimaPosicao[]>(`${this.apiUrl}/rastreamento/posicoes`);
  }

  buscarPontosDiario(diarioId: string): Observable<PontoRastreamento[]> {
    return this.http.get<PontoRastreamento[]>(`${this.apiUrl}/rastreamento/diario/${diarioId}`);
  }
}
