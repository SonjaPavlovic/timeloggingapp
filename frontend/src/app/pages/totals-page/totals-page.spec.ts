import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TotalsPage } from './totals-page';

describe('TotalsPage', () => {
  let component: TotalsPage;
  let fixture: ComponentFixture<TotalsPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TotalsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TotalsPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders per-day and per-activity totals with grand totals', () => {
    httpMock
      .expectOne((r) => r.url === '/api/totals/by-day')
      .flush({ items: [{ date: '2026-01-15', totalMinutes: 105, entryCount: 3 }], grandTotalMinutes: 105 });
    httpMock
      .expectOne((r) => r.url === '/api/totals/by-activity')
      .flush({
        items: [{ activityTypeId: 1, activityTypeName: 'Development', totalMinutes: 105, entryCount: 3 }],
        grandTotalMinutes: 105,
      });

    expect(component.byDay().length).toBe(1);
    expect(component.byDayGrandTotal()).toBe(105);
    expect(component.byActivity().length).toBe(1);
    expect(component.byActivityGrandTotal()).toBe(105);
  });
});
