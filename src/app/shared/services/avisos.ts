import { Injectable, signal } from '@angular/core';
import { mensagemDeErro } from '../utils/erros';

export type TipoAviso = 'sucesso' | 'erro';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

const DURACAO_MS: Record<TipoAviso, number> = { sucesso: 4000, erro: 8000 };

// Avisos rápidos (toast) que aparecem no canto da tela e somem sozinhos.
@Injectable({ providedIn: 'root' })
export class AvisosService {

  readonly avisos = signal<Aviso[]>([]);
  private proximoId = 1;

  sucesso(texto: string): void {
    this.mostrar('sucesso', texto);
  }

  erro(texto: string): void {
    this.mostrar('erro', texto);
  }

  // Erro de uma chamada HTTP: escolhe a mensagem pela regra de shared/utils/erros.ts.
  erroHttp(erro: unknown): void {
    this.mostrar('erro', mensagemDeErro(erro));
  }

  fechar(id: number): void {
    this.avisos.update(lista => lista.filter(a => a.id !== id));
  }

  private mostrar(tipo: TipoAviso, texto: string): void {
    const id = this.proximoId++;
    this.avisos.update(lista => [...lista, { id, tipo, texto }]);
    setTimeout(() => this.fechar(id), DURACAO_MS[tipo]);
  }
}
