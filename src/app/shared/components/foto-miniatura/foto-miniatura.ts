import { AfterViewInit, Component, ElementRef, OnDestroy, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { FotosCache } from '../../services/fotos-cache';

// Imagem de uma foto da API (precisa de token, por isso vem do FotosCache como "blob:").
// Só baixa quando aparece na tela (IntersectionObserver); sem esse recurso no navegador, baixa na hora.
// Precisa de FotosCache nos providers da tela.
@Component({
  selector: 'app-foto-miniatura',
  standalone: true,
  host: { class: 'block' },
  templateUrl: './foto-miniatura.html'
})
export class FotoMiniaturaComponent implements AfterViewInit, OnDestroy {
  fotoId = input.required<string>();
  alt = input.required<string>();
  // Classes do <img> e do espaço reservado (tamanho e recorte).
  classe = input('w-full h-24 object-cover rounded-lg');

  url = signal<string | null>(null);
  erro = signal(false);

  private observador?: IntersectionObserver;
  private inscricao?: Subscription;

  constructor(private host: ElementRef<HTMLElement>, private cache: FotosCache) {}

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.carregar();
      return;
    }
    this.observador = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) {
        this.observador?.disconnect();
        this.carregar();
      }
    }, { rootMargin: '100px' });
    this.observador.observe(this.host.nativeElement);
  }

  carregar(): void {
    this.erro.set(false);
    this.inscricao?.unsubscribe();
    this.inscricao = this.cache.url(this.fotoId()).subscribe({
      next: url => this.url.set(url),
      error: () => this.erro.set(true)
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.inscricao?.unsubscribe();
  }
}
