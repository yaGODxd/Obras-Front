import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Abastecimentos } from './abastecimentos';

describe('Abastecimentos', () => {
  let component: Abastecimentos;
  let fixture: ComponentFixture<Abastecimentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Abastecimentos],
    }).compileComponents();

    fixture = TestBed.createComponent(Abastecimentos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
