import { Injectable, OnDestroy } from '@angular/core';
import { Observable, finalize, map, of, shareReplay, tap } from 'rxjs';
import { FotoDiario } from '../../interfaces/foto';
import { FotoService } from '../../services/foto';

// Fotos já buscadas, enquanto a TELA estiver aberta. NÃO é global: a tela coloca em providers
// (ex.: lancamento-mensal) e, ao sair dela, o Angular chama ngOnDestroy, que libera as URLs dos blobs.
// Cada imagem é baixada uma vez só (o navegador também guarda: a API manda ETag e Cache-Control de 1 dia).
@Injectable()
export class FotosCache implements OnDestroy {
  private listas = new Map<string, FotoDiario[]>();
  private urls = new Map<string, string>();
  private pedidos = new Map<string, Observable<string>>();
  private pedidosListas = new Map<string, Observable<FotoDiario[]>>();
  private destruido = false;

  constructor(private fotoService: FotoService) {}

  // Dados das fotos de um diário (sem imagem). Vários pedidos ao mesmo tempo (seção Fotos e
  // fotos de cada abastecimento/ocorrência) viram uma chamada só.
  fotosDoDiario(diarioId: string): Observable<FotoDiario[]> {
    const guardada = this.listas.get(diarioId);
    if (guardada) return of(guardada);
    let pedido = this.pedidosListas.get(diarioId);
    if (!pedido) {
      pedido = this.fotoService.listarFotosDoDiario(diarioId).pipe(
        tap(lista => this.listas.set(diarioId, lista)),
        finalize(() => this.pedidosListas.delete(diarioId)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.pedidosListas.set(diarioId, pedido);
    }
    return pedido;
  }

  // URL "blob:" da imagem, para o <img>. Pedidos repetidos da mesma foto viram uma chamada só.
  url(fotoId: string): Observable<string> {
    const pronta = this.urls.get(fotoId);
    if (pronta) return of(pronta);
    let pedido = this.pedidos.get(fotoId);
    if (!pedido) {
      pedido = this.fotoService.baixarFoto(fotoId).pipe(
        map(blob => {
          const url = URL.createObjectURL(blob);
          // Chegou depois de a tela fechar: libera na hora.
          if (this.destruido) URL.revokeObjectURL(url);
          else this.urls.set(fotoId, url);
          return url;
        }),
        finalize(() => this.pedidos.delete(fotoId)),
        // refCount: se ninguém mais espera a foto (tela fechou), o download é cancelado.
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.pedidos.set(fotoId, pedido);
    }
    return pedido;
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.urls.forEach(url => URL.revokeObjectURL(url));
    this.urls.clear();
    this.listas.clear();
    this.pedidos.clear();
    this.pedidosListas.clear();
  }
}
