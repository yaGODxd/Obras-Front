import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaLogado()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.getPerfil() !== 'gestor') {
    auth.logout();
    router.navigate(['/login']);
    return false;
  }

  return true;
};