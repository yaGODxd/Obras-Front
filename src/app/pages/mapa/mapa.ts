import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService, UltimaPosicao } from '../../services/usuario';
import { interval, Subscription, startWith } from 'rxjs';
import * as L from 'leaflet';

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
  posicoes: UltimaPosicao[] = [];
  carregando = true;

  constructor(private usuarioService: UsuarioService) {}

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
    this.mapa = L.map('mapa', {
      center: [-26.0078, -51.3356],
      zoom: 13
    });

    // Satélite Esri (base)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri'
    }).addTo(this.mapa);

    // Labels por cima: ruas, cidades, bairros
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: ''
    }).addTo(this.mapa);
  }

  private atualizarPosicoes(): void {
    // Renomeado de buscarUltimasPosicoes → listarPosicoesAtuais
    this.usuarioService.listarPosicoesAtuais().subscribe({
      next: (posicoes) => {
        this.posicoes = posicoes;
        this.carregando = false;
        this.atualizarMarcadores(posicoes);
      },
      error: () => {
        this.carregando = false;
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

      // Popup atualizado com campos novos: veiculoPlaca e destino
      const popup = `
        <div style="min-width: 180px">
          <p style="font-weight: bold; margin: 0 0 4px">${posicao.nomeCompleto}</p>
          <p style="margin: 0 0 2px; color: #555; font-size: 12px">@${posicao.login}</p>
          ${posicao.veiculoDescricao ? `<p style="margin: 4px 0; font-size: 12px">🚛 ${posicao.veiculoDescricao}${posicao.veiculoPlaca ? ' — ' + posicao.veiculoPlaca : ''}</p>` : ''}
          ${posicao.destino ? `<p style="margin: 4px 0; font-size: 12px">📍 ${posicao.destino}</p>` : ''}
          <p style="margin: 4px 0; font-size: 11px; color: #888">
            Última atualização:<br>${posicao.registradoEm ? new Date(posicao.registradoEm).toLocaleString('pt-BR') : '-'}
          </p>
        </div>
      `;

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

  getTempoAtras(registradoEm: string | null): string {
    if (!registradoEm) return 'Desconhecido';
    const diff = Date.now() - new Date(registradoEm).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min}min atrás`;
    return `${Math.floor(min / 60)}h atrás`;
  }
}