import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VeiculoDetalhe } from './veiculo-detalhe';

describe('VeiculoDetalhe', () => {
  let component: VeiculoDetalhe;
  let fixture: ComponentFixture<VeiculoDetalhe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VeiculoDetalhe],
    }).compileComponents();

    fixture = TestBed.createComponent(VeiculoDetalhe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
