import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './shared/components/nav-bar/nav-bar';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AvisosComponent } from './shared/components/avisos/avisos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBar, CommonModule, AvisosComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  rotaAtual = signal('');

  // Ignora a parte depois do "?" (ex.: /login?motivo=sessao-expirada).
  mostrarLogin = computed(() => {
    const caminho = this.rotaAtual().split('?')[0];
    return caminho === '/login' || caminho === '/';
  });

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(e => {
      this.rotaAtual.set(e.urlAfterRedirects);
    });
  }

  ngOnInit(): void {
    const tema = localStorage.getItem('tema') ?? 'obras-slate';
    document.documentElement.setAttribute('data-theme', tema);
  }
}