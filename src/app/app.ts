import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './shared/components/nav-bar/nav-bar';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'SistemaObras';
  rotaAtual = signal('');

  mostrarLogin = computed(() =>
    this.rotaAtual() === '/login' || this.rotaAtual() === '/'
  );

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.rotaAtual.set(e.urlAfterRedirects);
    });
  }

  ngOnInit(): void {
    const tema = localStorage.getItem('tema') ?? 'obras-slate';
    document.documentElement.setAttribute('data-theme', tema);
  }
}