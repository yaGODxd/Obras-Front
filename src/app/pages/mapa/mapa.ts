import { Component, OnInit, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RastreamentoService } from '../../services/rastreamento';
import { UltimaPosicao } from '../../interfaces/rastreamento';
import { interval, Subscription, startWith } from 'rxjs';
import * as L from 'leaflet';
import { criarElemento } from '../../shared/utils/html';
import { rotuloVeiculo } from '../../shared/utils/placa';
import { CENTRO_CRUZ_MACHADO, criarMapa } from '../../shared/utils/mapa';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css'
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {

  private mapa!: L.Map;
  private marcadores: Map<string, L.Marker> = new Map();
  private subscription?: Subscription;
  // Signals: mudam depois da resposta HTTP (o app roda sem zone.js).
  posicoes = signal<UltimaPosicao[]>([]);
  carregando = signal(true);

  constructor(private rastreamentoService: RastreamentoService) {}

  ngAfterViewInit(): void {
    this.iniciarMapa();
  }

  ngOnInit(): void {
    this.subscription = interval(30000).pipe(
      startWith(0)
    ).subscribe(() => this.atualizarPosicoes());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.mapa) this.mapa.remove();
  }

  private iniciarMapa(): void {
    this.mapa = criarMapa('mapa', { center: CENTRO_CRUZ_MACHADO, zoom: 13 });
  }

  private atualizarPosicoes(): void {
    // Renomeado de buscarUltimasPosicoes → listarPosicoesAtuais
    this.rastreamentoService.listarPosicoesAtuais().subscribe({
      next: (posicoes) => {
        this.posicoes.set(posicoes);
        this.carregando.set(false);
        this.atualizarMarcadores(posicoes);
      },
      error: () => {
        this.carregando.set(false);
      }
    });
  }

  private atualizarMarcadores(posicoes: UltimaPosicao[]): void {
    if (!this.mapa) return;

    // Remove marcadores de motoristas que saíram
    this.marcadores.forEach((marcador, login) => {
      if (!posicoes.find(p => p.login === login)) {
        this.mapa.removeLayer(marcador);
        this.marcadores.delete(login);
      }
    });

    // Adiciona ou atualiza marcadores
    posicoes.forEach(posicao => {
      const icone = L.divIcon({
        className: '',
        html: `
          <div style="
            background: #1d4ed8;
            border: 3px solid white;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 18px;
          ">🚛</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const popup = this.criarPopup(posicao);

      if (this.marcadores.has(posicao.login)) {
        const marcador = this.marcadores.get(posicao.login)!;
        marcador.setLatLng([posicao.latitude, posicao.longitude]);
        marcador.setPopupContent(popup);
      } else {
        const marcador = L.marker([posicao.latitude, posicao.longitude], { icon: icone })
          .bindPopup(popup)
          .addTo(this.mapa);
        this.marcadores.set(posicao.login, marcador);
      }
    });

    // Centraliza o mapa se houver posições
    if (posicoes.length > 0 && this.marcadores.size === posicoes.length) {
      const grupo = L.featureGroup(Array.from(this.marcadores.values()));
      this.mapa.fitBounds(grupo.getBounds().pad(0.2));
    }
  }

  // Montado via DOM: nome, destino e veículo vêm do app do motorista e não podem virar HTML.
  private criarPopup(posicao: UltimaPosicao): HTMLElement {
    const caixa = criarElemento('div', '', 'min-width: 180px');
    caixa.append(
      criarElemento('p', posicao.nomeCompleto, 'font-weight: bold; margin: 0 0 4px'),
      criarElemento('p', `@${posicao.login}`, 'margin: 0 0 2px; color: #555; font-size: 12px')
    );
    if (posicao.veiculoDescricao) {
      caixa.append(criarElemento('p', `🚛 ${rotuloVeiculo(posicao.veiculoDescricao, posicao.veiculoPlaca)}`, 'margin: 4px 0; font-size: 12px'));
    }
    if (posicao.destino) {
      caixa.append(criarElemento('p', `📍 ${posicao.destino}`, 'margin: 4px 0; font-size: 12px'));
    }
    const atualizacao = criarElemento('p', 'Última atualização:', 'margin: 4px 0; font-size: 11px; color: #888');
    atualizacao.append(
      document.createElement('br'),
      posicao.registradoEm ? new Date(posicao.registradoEm).toLocaleString('pt-BR') : '-'
    );
    caixa.append(atualizacao);
    return caixa;
  }

  getTempoAtras(registradoEm: string | null): string {
    if (!registradoEm) return 'Desconhecido';
    const diff = Date.now() - new Date(registradoEm).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min}min atrás`;
    return `${Math.floor(min / 60)}h atrás`;
  }
}