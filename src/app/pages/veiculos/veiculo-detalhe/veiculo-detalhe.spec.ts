import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { VeiculoDetalhe } from './veiculo-detalhe';

describe('VeiculoDetalhe', () => {
  let component: VeiculoDetalhe;
  let fixture: ComponentFixture<VeiculoDetalhe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VeiculoDetalhe],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(VeiculoDetalhe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
