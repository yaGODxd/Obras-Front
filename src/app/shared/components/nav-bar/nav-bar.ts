import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
})
export class NavBar {

  tema = signal(localStorage.getItem('tema') ?? 'light');
  rotaAtual = signal('');

  mostrarNav = computed(() => !this.rotaAtual().includes('/login'));

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.rotaAtual.set(e.urlAfterRedirects);
    });
  }

  sidebarAberta = true;

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
    localStorage.clear();
    this.router.navigate(['']);
  }
}