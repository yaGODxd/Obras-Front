import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MapaComponent } from './mapa';
import { environment } from '../../../environments/environment';

describe('Mapa', () => {
  let component: MapaComponent;
  let fixture: ComponentFixture<MapaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MapaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('o carregamento some depois da resposta (antes, sem zone.js, podia ficar girando)', async () => {
    const api = TestBed.inject(HttpTestingController);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.loading')).not.toBeNull();

    api.expectOne(`${environment.apiUrl}/rastreamento/posicoes`).flush([]);
    await fixture.whenStable();

    expect(component.carregando()).toBe(false);
    expect(el.querySelector('.loading')).toBeNull();
    expect(el.textContent).toContain('Nenhum motorista com posição registrada');
  });
});
