import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivityTypesPage } from './activity-types-page';

describe('ActivityTypesPage', () => {
  let component: ActivityTypesPage;
  let fixture: ComponentFixture<ActivityTypesPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityTypesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityTypesPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne('/api/activity-types').flush({ items: [{ id: 1, name: 'Development' }], count: 1 });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
    expect(component.types().length).toBe(1);
  });

  it('shows an explanatory message rather than a generic failure on 409 IN_USE', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.remove(1);

    const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url === '/api/activity-types/1');
    req.flush(
      { error: { code: 'IN_USE', message: 'in use' } },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.error()).toContain('used by one or more time entries');
  });
});
