import { Component, OnInit, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FotoDiario } from '../../../interfaces/foto';
import { FotosCache } from '../../services/fotos-cache';
import { comRecebidoEm, rotuloTipoFoto } from '../../utils/fotos';
import { FotoMiniaturaComponent } from '../foto-miniatura/foto-miniatura';
import { SeloHorarioSuspeitoComponent } from '../selo-horario-suspeito/selo-horario-suspeito';

// Fotos ligadas a UM abastecimento ou a UMA ocorrência do diário (pelo abastecimentoId/ocorrenciaId da foto).
// A lista de dados vem do FotosCache (uma chamada por diário, dividida entre todos os itens);
// cada imagem só baixa quando aparece. Clicar amplia logo abaixo, sem abrir outro modal.
// Sem fotos (ou se a lista falhar), não mostra nada: a seção "Fotos" do diário é quem mostra o erro.
@Component({
  selector: 'app-fotos-vinculadas',
  standalone: true,
  imports: [CommonModule, FotoMiniaturaComponent, SeloHorarioSuspeitoComponent],
  templateUrl: './fotos-vinculadas.html'
})
export class FotosVinculadasComponent implements OnInit {
  diarioId = input.required<string>();
  abastecimentoId = input<string | null>(null);
  ocorrenciaId = input<string | null>(null);
  // Espaçamento em volta (só aparece quando há fotos).
  classe = input('');

  private todas = signal<FotoDiario[]>([]);
  fotos = computed(() => {
    const a = this.abastecimentoId();
    const o = this.ocorrenciaId();
    return this.todas()
      .filter(f => (a !== null && f.abastecimentoId === a) || (o !== null && f.ocorrenciaId === o))
      .map(comRecebidoEm);
  });
  ampliada = signal<FotoDiario | null>(null);

  rotuloTipo = rotuloTipoFoto;

  constructor(private cache: FotosCache) {}

  ngOnInit(): void {
    this.cache.fotosDoDiario(this.diarioId()).subscribe({
      next: lista => this.todas.set(lista),
      error: () => this.todas.set([])
    });
  }

  alternar(f: FotoDiario): void {
    this.ampliada.set(this.ampliada()?.id === f.id ? null : f);
  }
}
