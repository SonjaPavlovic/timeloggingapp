import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivityType } from '../models';

@Injectable({ providedIn: 'root' })
export class ActivityTypeService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/activity-types';

  list(): Observable<{ items: ActivityType[]; count: number }> {
    return this.http.get<{ items: ActivityType[]; count: number }>(this.base);
  }

  create(name: string): Observable<ActivityType> {
    return this.http.post<ActivityType>(this.base, { name });
  }

  update(id: number, name: string): Observable<ActivityType> {
    return this.http.put<ActivityType>(`${this.base}/${id}`, { name });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
