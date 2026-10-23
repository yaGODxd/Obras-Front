import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoginResponse } from '../../interfaces/auth';
import { mensagemDeErro } from '../../shared/utils/erros';

// Depois disso, avisa que o servidor gratuito pode estar acordando (leva cerca de 1 minuto).
const AVISO_DEMORA_MS = 5000;

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
  erro = signal('');
  carregando = signal(false);
  demorando = signal(false);
  aviso = signal('');

  private timerDemora?: ReturnType<typeof setTimeout>;

  constructor(
    private authService: AuthService,
    private router: Router,
    route: ActivatedRoute
  ) {
    if (route.snapshot.queryParamMap.get('motivo') === 'sessao-expirada') {
      this.aviso.set('Sua sessão expirou. Entre novamente.');
    }
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timerDemora));
  }

  toggleSenha(): void {
    this.senhaVisivel = !this.senhaVisivel;
  }

  entrar(): void {
    if (!this.login || !this.senha) {
      this.erro.set('Preencha todos os campos!');
      return;
    }

    this.erro.set('');
    this.aviso.set('');
    this.carregando.set(true);
    this.timerDemora = setTimeout(() => this.demorando.set(true), AVISO_DEMORA_MS);

    this.authService.login({ login: this.login, senha: this.senha }).subscribe({
      next: (response: LoginResponse) => {
        this.finalizarEspera();
        this.authService.salvarSessao(response, this.login);

        if (response.perfil !== 'gestor') {
          this.authService.logout();
          this.erro.set('Acesso restrito a gestores. Use o aplicativo móvel.');
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (erro: unknown) => {
        this.finalizarEspera();
        this.erro.set(this.mensagemDeErro(erro));
      }
    });
  }

  private finalizarEspera(): void {
    clearTimeout(this.timerDemora);
    this.carregando.set(false);
    this.demorando.set(false);
  }

  // No login, o 401 é "senha errada" (a API manda corpo vazio). O resto segue a regra central.
  private mensagemDeErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse && erro.status === 401) {
      return 'Login ou senha incorretos, ou usuário inativo.';
    }
    return mensagemDeErro(erro);
  }
}
