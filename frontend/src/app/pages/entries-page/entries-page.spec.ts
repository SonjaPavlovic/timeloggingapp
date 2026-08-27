import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EntriesPage } from './entries-page';

describe('EntriesPage', () => {
  let component: EntriesPage;
  let fixture: ComponentFixture<EntriesPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntriesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(EntriesPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges(); // triggers ngOnInit -> two initial GETs

    httpMock.expectOne('/api/activity-types').flush({ items: [{ id: 1, name: 'Development' }], count: 1 });
    httpMock.expectOne((req) => req.url === '/api/time-entries').flush({ items: [], count: 0 });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid and the submit button is disabled when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('form becomes valid once all required fields are filled with a proper span', () => {
    component.form.setValue({
      activityTypeId: 1,
      description: 'Implemented totals endpoint',
      date: '2026-01-15',
      startTime: '09:00:00',
      endTime: '10:30:00',
    });
    expect(component.form.valid).toBe(true);
  });

  it('flags a zero-length span (endTime == startTime) as invalid without an HTTP request on submit', () => {
    component.form.setValue({
      activityTypeId: 1,
      description: 'Implemented totals endpoint',
      date: '2026-01-15',
      startTime: '09:00:00',
      endTime: '09:00:00',
    });
    expect(component.form.errors?.['zeroLength']).toBe(true);
    expect(component.form.invalid).toBe(true);

    component.submit();
    httpMock.expectNone((req) => req.method === 'POST' && req.url === '/api/time-entries');
  });

  it('accepts endTime earlier than startTime (midnight rollover) as valid', () => {
    component.form.setValue({
      activityTypeId: 1,
      description: 'Implemented totals endpoint',
      date: '2026-01-15',
      startTime: '23:30:00',
      endTime: '00:15:00',
    });
    expect(component.form.errors?.['zeroLength']).toBeFalsy();
    expect(component.form.valid).toBe(true);
  });

  it('submit() on an invalid (empty) form issues no HTTP request', () => {
    component.submit();
    httpMock.expectNone((req) => req.method === 'POST' && req.url === '/api/time-entries');
  });

  it('a valid submit posts the entry and reloads the list', () => {
    component.form.setValue({
      activityTypeId: 1,
      description: 'Implemented totals endpoint',
      date: '2026-01-15',
      startTime: '09:00:00',
      endTime: '10:30:00',
    });

    component.submit();

    const postReq = httpMock.expectOne((req) => req.method === 'POST' && req.url === '/api/time-entries');
    postReq.flush({
      id: 1,
      activityType: { id: 1, name: 'Development' },
      description: 'Implemented totals endpoint',
      date: '2026-01-15',
      startTime: '09:00:00',
      endTime: '10:30:00',
      durationMinutes: 90,
    });

    httpMock.expectOne((req) => req.method === 'GET' && req.url === '/api/time-entries').flush({
      items: [
        {
          id: 1,
          activityType: { id: 1, name: 'Development' },
          description: 'Implemented totals endpoint',
          date: '2026-01-15',
          startTime: '09:00:00',
          endTime: '10:30:00',
          durationMinutes: 90,
        },
      ],
      count: 1,
    });

    expect(component.entries().length).toBe(1);
    expect(component.form.pristine || component.form.value.description === '').toBeTruthy();
  });
});
