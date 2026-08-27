import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimeEntry, TimeEntryWrite } from '../models';

export interface TimeEntryFilter {
  from?: string;
  to?: string;
  activityTypeId?: number;
}

@Injectable({ providedIn: 'root' })
export class TimeEntryService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/time-entries';

  list(filter: TimeEntryFilter = {}): Observable<{ items: TimeEntry[]; count: number }> {
    let params = new HttpParams();
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    if (filter.activityTypeId !== undefined) params = params.set('activityTypeId', filter.activityTypeId);
    return this.http.get<{ items: TimeEntry[]; count: number }>(this.base, { params });
  }

  create(entry: TimeEntryWrite): Observable<TimeEntry> {
    return this.http.post<TimeEntry>(this.base, entry);
  }

  update(id: number, entry: TimeEntryWrite): Observable<TimeEntry> {
    return this.http.put<TimeEntry>(`${this.base}/${id}`, entry);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
