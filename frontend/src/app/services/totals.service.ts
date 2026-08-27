import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivityTotal, DayTotal } from '../models';

export interface RangeFilter {
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class TotalsService {
  private readonly http = inject(HttpClient);

  byDay(filter: RangeFilter = {}): Observable<{ items: DayTotal[]; grandTotalMinutes: number }> {
    return this.http.get<{ items: DayTotal[]; grandTotalMinutes: number }>('/api/totals/by-day', {
      params: this.toParams(filter),
    });
  }

  byActivity(filter: RangeFilter = {}): Observable<{ items: ActivityTotal[]; grandTotalMinutes: number }> {
    return this.http.get<{ items: ActivityTotal[]; grandTotalMinutes: number }>('/api/totals/by-activity', {
      params: this.toParams(filter),
    });
  }

  private toParams(filter: RangeFilter): HttpParams {
    let params = new HttpParams();
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return params;
  }
}
