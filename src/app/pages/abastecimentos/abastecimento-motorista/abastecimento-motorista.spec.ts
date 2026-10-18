import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbastecimentoMotorista } from './abastecimento-motorista';

describe('AbastecimentoMotorista', () => {
  let component: AbastecimentoMotorista;
  let fixture: ComponentFixture<AbastecimentoMotorista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbastecimentoMotorista],
    }).compileComponents();

    fixture = TestBed.createComponent(AbastecimentoMotorista);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
