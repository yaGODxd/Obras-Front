import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoginResponse } from '../../interfaces/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  login = '';
  senha = '';
  senhaVisivel = false;
  erro = '';
  carregando = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSenha(): void {
    this.senhaVisivel = !this.senhaVisivel;
  }

  entrar(): void {
    if (!this.login || !this.senha) {
      this.erro = 'Preencha todos os campos!';
      return;
    }

    this.erro = '';
    this.carregando = true;

    this.authService.login({ login: this.login, senha: this.senha }).subscribe({
      next: (response: LoginResponse) => {
        this.authService.salvarSessao(response, this.login);

        if (response.perfil !== 'gestor') {
          this.authService.logout();
          this.erro = 'Acesso restrito a gestores. Use o aplicativo móvel.';
          this.carregando = false;
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.erro = 'Login ou senha incorretos!';
        this.carregando = false;
      }
    });
  }
}