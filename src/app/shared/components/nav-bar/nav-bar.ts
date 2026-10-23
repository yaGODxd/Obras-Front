import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../services/auth';

// Abaixo desta largura (lg do Tailwind) o menu vira gaveta com botão na barra superior.
const LARGURA_CELULAR = '(max-width: 1023.98px)';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
  host: { '(document:keydown.escape)': 'fecharMenuMovel()' }
})
export class NavBar {

  // Celular: gaveta do menu aberta/fechada. No computador o menu sempre aparece.
  menuMovelAberto = signal(false);

  constructor(private router: Router, private authService: AuthService) {
    // takeUntilDestroyed: a nav-bar é recriada a cada login; sem isso as assinaturas se acumulam.
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.menuMovelAberto.set(false); // no celular, escolher uma tela fecha o menu
    });
  }

  // Começa aberto no computador (decisão do projeto).
  sidebarAberta = true;

  abrirMenuMovel(): void {
    this.sidebarAberta = true; // no celular a gaveta mostra sempre os nomes
    this.menuMovelAberto.set(true);
  }

  fecharMenuMovel(): void {
    this.menuMovelAberto.set(false);
  }

  // Botão do topo do menu: no celular fecha a gaveta; no computador recolhe/expande.
  alternarMenu(): void {
    if (window.matchMedia(LARGURA_CELULAR).matches) {
      this.fecharMenuMovel();
    } else {
      this.toggleSidebar();
    }
  }

  gruposAbertos: { [key: string]: boolean } = {
    principal:   true,
    operacional: false,
    gestao:      false,
  };

  toggleSidebar() {
    this.sidebarAberta = !this.sidebarAberta;
    if (!this.sidebarAberta) {
      Object.keys(this.gruposAbertos).forEach(k => this.gruposAbertos[k] = false);
    }
  }

  toggleGrupo(grupo: string) {
    if (!this.sidebarAberta) {
      this.sidebarAberta = true;
      this.gruposAbertos[grupo] = true;
      return;
    }
    this.gruposAbertos[grupo] = !this.gruposAbertos[grupo];
  }

  isGrupoAberto(grupo: string): boolean {
    return this.gruposAbertos[grupo] ?? false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}