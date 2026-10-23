import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '../interfaces/auth';
import { environment } from '../../environments/environment';

// Chaves da sessão no localStorage. O 'tema' fica de fora de propósito: sobrevive ao logout.
const CHAVES_SESSAO = ['token', 'nome', 'perfil', 'login'];

interface PayloadToken {
  exp?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, request);
  }

  salvarSessao(response: LoginResponse, login: string): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('nome', response.nome);
    localStorage.setItem('perfil', response.perfil);
    localStorage.setItem('login', login);
  }

  logout(): void {
    CHAVES_SESSAO.forEach(chave => localStorage.removeItem(chave));
  }

  estaLogado(): boolean {
    return !!localStorage.getItem('token');
  }

  // A API grava o exp em MILISSEGUNDOS (o padrão JWT seria segundos), por isso compara direto com Date.now().
  // Isto só melhora a experiência no front: quem valida o token de verdade é a API.
  tokenValido(): boolean {
    const exp = this.lerPayload()?.exp;
    return typeof exp === 'number' && exp > Date.now();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getNome(): string | null {
    return localStorage.getItem('nome');
  }

  // Depois de o gestor mudar o próprio nome em Configurações.
  atualizarNome(nome: string): void {
    localStorage.setItem('nome', nome);
  }

  getLogin(): string | null {
    return localStorage.getItem('login');
  }

  getPerfil(): string | null {
    return localStorage.getItem('perfil');
  }

  private lerPayload(): PayloadToken | null {
    const partes = this.getToken()?.split('.');
    if (!partes || partes.length !== 3) return null;
    try {
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      return typeof payload === 'object' && payload !== null ? payload : null;
    } catch {
      return null;
    }
  }
}
