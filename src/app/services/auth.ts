import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '../interfaces/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'https://sistema-obras-api.onrender.com';

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
    localStorage.clear();
  }

  estaLogado(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getNome(): string | null {
    return localStorage.getItem('nome');
  }

  getLogin(): string | null {
    return localStorage.getItem('login');
  }

  getPerfil(): string | null {
    return localStorage.getItem('perfil');
  }
}