import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TotalsService } from '../../services/totals.service';
import { ActivityTotal, ApiErrorBody, DayTotal } from '../../models';
import { formatDuration } from '../../shared/duration.util';

@Component({
  imports: [],
  selector: 'app-totals-page',
  styleUrl: './totals-page.css',
  templateUrl: './totals-page.html',
})
export class TotalsPage implements OnInit {
  private readonly service = inject(TotalsService);

  readonly byDay = signal<DayTotal[]>([]);
  readonly byDayGrandTotal = signal(0);
  readonly byActivity = signal<ActivityTotal[]>([]);
  readonly byActivityGrandTotal = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get formatDuration() {
    return formatDuration;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.byDay().subscribe({
      next: (res) => {
        this.byDay.set(res.items);
        this.byDayGrandTotal.set(res.grandTotalMinutes);
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFor(err)),
    });

    this.service.byActivity().subscribe({
      next: (res) => {
        this.byActivity.set(res.items);
        this.byActivityGrandTotal.set(res.grandTotalMinutes);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFor(err));
        this.loading.set(false);
      },
    });
  }

  private messageFor(err: HttpErrorResponse): string {
    const body = err.error as ApiErrorBody | undefined;
    return body?.error?.message ?? 'Something went wrong. Please try again.';
  }
}
