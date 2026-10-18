import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManutencaoDetalhe } from './manutencao-detalhe';

describe('ManutencaoDetalhe', () => {
  let component: ManutencaoDetalhe;
  let fixture: ComponentFixture<ManutencaoDetalhe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManutencaoDetalhe],
    }).compileComponents();

    fixture = TestBed.createComponent(ManutencaoDetalhe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
