import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LancamentoMensal } from './lancamento-mensal';

describe('LancamentoMensal', () => {
  let component: LancamentoMensal;
  let fixture: ComponentFixture<LancamentoMensal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LancamentoMensal],
    }).compileComponents();

    fixture = TestBed.createComponent(LancamentoMensal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
