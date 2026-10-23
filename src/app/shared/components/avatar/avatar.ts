import { Component, computed, input, linkedSignal } from '@angular/core';
import { urlDaFoto } from '../../utils/imagem';

// Classes escritas por inteiro para o Tailwind encontrar.
const TAMANHOS = {
  8: { caixa: 'w-8 h-8', texto: 'text-xs' },
  9: { caixa: 'w-9 h-9', texto: 'text-sm' },
  10: { caixa: 'w-10 h-10', texto: 'text-sm' },
  16: { caixa: 'w-16 h-16', texto: 'text-2xl' },
} as const;

const CORES = {
  primary: 'bg-primary text-primary-content',
  success: 'bg-success text-success-content',
} as const;

// Foto redonda da pessoa. Sem foto, ou se a imagem não carregar, a inicial CENTRALIZADA sobre a cor.
// A inicial não depende da classe "placeholder" do DaisyUI (no DaisyUI 5 ela virou "avatar-placeholder"
// e, sem ela, o texto ficava no canto): o círculo é um flex centralizado.
// Use este componente em todo lugar que mostra pessoa (não monte <img> de foto de perfil à mão).
@Component({
  selector: 'app-avatar',
  standalone: true,
  host: { class: 'inline-flex shrink-0 align-middle' },
  templateUrl: './avatar.html'
})
export class AvatarComponent {
  foto = input<string | null>(null);
  nome = input.required<string>();
  tamanho = input<keyof typeof TAMANHOS>(9);
  // Texto no lugar da foto; se não vier, usa a primeira letra do nome.
  iniciais = input<string | null>(null);
  cor = input<keyof typeof CORES>('primary');
  // Classes extras do círculo (ex.: anel "ring-2 ring-primary").
  classe = input('');
  // Endereço pronto da imagem (ex.: prévia "data:image/png;..." de um arquivo escolhido). Tem preferência sobre "foto".
  src = input<string | null>(null);

  classes = computed(() => TAMANHOS[this.tamanho()]);
  corInicial = computed(() => CORES[this.cor()]);
  // urlDaFoto limpa espaços/quebras e prefixa "data:image/jpeg;base64," quando falta.
  url = computed(() => this.src() || urlDaFoto(this.foto()));
  // A imagem falhou ao carregar: mostra a inicial. Volta a tentar quando a foto muda.
  falhou = linkedSignal({ source: this.url, computation: () => false });
  letras = computed(() => this.iniciais() || this.nome().trim().charAt(0).toUpperCase() || '?');
}
