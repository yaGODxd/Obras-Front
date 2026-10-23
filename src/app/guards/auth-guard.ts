import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaLogado()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.tokenValido()) {
    auth.logout();
    return router.createUrlTree(['/login'], { queryParams: { motivo: 'sessao-expirada' } });
  }

  if (auth.getPerfil() !== 'gestor') {
    auth.logout();
    return router.createUrlTree(['/login']);
  }

  return true;
};
