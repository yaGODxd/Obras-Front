import { Component, input } from '@angular/core';

// Badge que nunca deixa o texto vazar: o .badge do DaisyUI tem altura fixa e deixa o texto quebrar linha.
// Aqui o texto fica numa linha só, a altura acompanha o conteúdo e, se faltar largura, corta com "…".
// O texto completo vai no title (passe "titulo" quando "texto" for o rótulo curto).
@Component({
  selector: 'app-status-badge',
  standalone: true,
  host: { class: 'inline-flex max-w-full min-w-0 align-middle' },
  templateUrl: './status-badge.html'
})
export class StatusBadgeComponent {
  texto = input.required<string>();
  // Classes de cor e tamanho do DaisyUI (ex.: "badge-info", "badge-outline badge-sm"). Vêm dos utilitários.
  cor = input('');
  titulo = input<string | null>(null);
  // Ícone Tabler opcional (ex.: "ti-circle-check").
  icone = input<string | null>(null);
}
