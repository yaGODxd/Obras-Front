import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AtualizarPerfilRequest, AtualizarUsuarioRequest, CriarUsuarioRequest, MotoristaOnline, SecretariaResponse,
  UsuarioResponse
} from '../interfaces/usuario';

// Usuários (gestores e motoristas) e secretarias.
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioResponse[]> {
    return this.http.get<UsuarioResponse[]>(`${this.apiUrl}/usuarios`);
  }

  buscarPerfil(login: string): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/usuarios/${login}`);
  }

  criarUsuario(request: CriarUsuarioRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/cadastrar`, request);
  }

  atualizarUsuario(login: string, request: AtualizarUsuarioRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/usuarios/${login}`, request);
  }

  atualizarPerfil(login: string, request: AtualizarPerfilRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/usuarios/${login}/perfil`, request);
  }

  alterarAtivo(login: string, ativo: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/usuarios/${login}/ativo`, { ativo });
  }

  listarMotoristasOnline(): Observable<MotoristaOnline[]> {
    return this.http.get<MotoristaOnline[]>(`${this.apiUrl}/usuarios/motoristas/online`);
  }

  listarSecretarias(): Observable<SecretariaResponse[]> {
    return this.http.get<SecretariaResponse[]>(`${this.apiUrl}/secretarias`);
  }
}
