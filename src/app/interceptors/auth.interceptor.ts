import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { environment } from '../../environments/environment';

// Envia o token em todas as chamadas à API (menos no login) e trata a sessão expirada (401).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const ehApi = req.url.startsWith(environment.apiUrl);
  const ehLogin = req.url === `${environment.apiUrl}/auth/login`;
  const token = auth.getToken();

  const pedido = ehApi && !ehLogin && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(pedido).pipe(
    catchError((erro: unknown) => {
      // O 401 do login é "senha errada" e fica com a tela de login.
      // Só age se ainda há sessão: com várias chamadas falhando juntas, só a primeira navega.
      if (ehApi && !ehLogin && erro instanceof HttpErrorResponse && erro.status === 401 && auth.estaLogado()) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { motivo: 'sessao-expirada' } });
      }
      return throwError(() => erro);
    })
  );
};
