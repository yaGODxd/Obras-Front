import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoricoDiario } from './historico-diario';

describe('HistoricoDiario', () => {
  let component: HistoricoDiario;
  let fixture: ComponentFixture<HistoricoDiario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricoDiario],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricoDiario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
