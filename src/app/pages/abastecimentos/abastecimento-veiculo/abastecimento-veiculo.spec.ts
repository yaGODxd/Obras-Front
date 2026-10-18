import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbastecimentoVeiculo } from './abastecimento-veiculo';

describe('AbastecimentoVeiculo', () => {
  let component: AbastecimentoVeiculo;
  let fixture: ComponentFixture<AbastecimentoVeiculo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbastecimentoVeiculo],
    }).compileComponents();

    fixture = TestBed.createComponent(AbastecimentoVeiculo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
