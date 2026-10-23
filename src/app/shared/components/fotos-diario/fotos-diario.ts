import { Component, input, linkedSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FotoDiario } from '../../../interfaces/foto';
import { FotosCache } from '../../services/fotos-cache';
import { mensagemDeErro } from '../../utils/erros';
import { comRecebidoEm, formatarTamanhoFoto, rotuloTipoFoto } from '../../utils/fotos';
import { FotoMiniaturaComponent } from '../foto-miniatura/foto-miniatura';
import { SeloHorarioSuspeitoComponent } from '../selo-horario-suspeito/selo-horario-suspeito';
import { ErroCarregarComponent } from '../erro-carregar/erro-carregar';

type EstadoFotos =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; fotos: FotoDiario[] }
  | { tipo: 'erro'; mensagem: string };

// Seção "Fotos" do detalhe do diário. Nada é buscado até o gestor abrir a seção;
// cada miniatura só baixa a imagem quando aparece. Ampliar mostra a foto aqui mesmo (sem outro modal).
// Precisa de FotosCache nos providers da tela.
@Component({
  selector: 'app-fotos-diario',
  standalone: true,
  imports: [CommonModule, FotoMiniaturaComponent, SeloHorarioSuspeitoComponent, ErroCarregarComponent],
  templateUrl: './fotos-diario.html'
})
export class FotosDiarioComponent {
  diarioId = input.required<string>();

  // Voltam ao início quando muda o diário.
  aberta = linkedSignal({ source: this.diarioId, computation: () => false });
  ampliada = linkedSignal<string, FotoDiario | null>({ source: this.diarioId, computation: () => null });
  estado = signal<EstadoFotos>({ tipo: 'carregando' });

  rotuloTipo = rotuloTipoFoto;
  tamanho = formatarTamanhoFoto;

  constructor(private cache: FotosCache) {}

  abrir(): void {
    this.aberta.set(true);
    this.carregar();
  }

  carregar(): void {
    const id = this.diarioId();
    this.estado.set({ tipo: 'carregando' });
    this.cache.fotosDoDiario(id).subscribe({
      next: fotos => {
        if (id !== this.diarioId()) return;
        const ordenadas = fotos.map(comRecebidoEm).sort((a, b) => (a.tiradaEm ?? '').localeCompare(b.tiradaEm ?? ''));
        this.estado.set({ tipo: 'pronto', fotos: ordenadas });
      },
      error: e => { if (id === this.diarioId()) this.estado.set({ tipo: 'erro', mensagem: mensagemDeErro(e) }); }
    });
  }

  ampliar(f: FotoDiario): void { this.ampliada.set(f); }
  voltar(): void { this.ampliada.set(null); }
}
