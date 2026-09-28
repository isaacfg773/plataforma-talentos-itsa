import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Postulaciones } from './postulaciones';

describe('Postulaciones', () => {
  let component: Postulaciones;
  let fixture: ComponentFixture<Postulaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Postulaciones],
    }).compileComponents();

    fixture = TestBed.createComponent(Postulaciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
