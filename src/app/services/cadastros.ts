import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MecanicoRequest, MecanicoResponse, PostoRequest, PostoResponse } from '../interfaces/cadastros';

// Cadastros de apoio: mecânicos e postos.
@Injectable({
  providedIn: 'root'
})
export class CadastrosService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

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
}
