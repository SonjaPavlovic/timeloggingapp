import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeEntryService } from '../../services/time-entry.service';
import { ActivityTypeService } from '../../services/activity-type.service';
import { ActivityType, ApiErrorBody, TimeEntry, TimeEntryWrite } from '../../models';
import { formatDuration } from '../../shared/duration.util';

/** Mirrors the backend's zero-length rule: endTime == startTime is invalid; endTime < startTime is a valid rollover. */
function zeroLengthValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;
  if (start && end && start === end) {
    return { zeroLength: true };
  }
  return null;
}

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-entries-page',
  styleUrl: './entries-page.css',
  templateUrl: './entries-page.html',
})
export class EntriesPage implements OnInit {
  private readonly entryService = inject(TimeEntryService);
  private readonly typeService = inject(ActivityTypeService);
  private readonly fb = inject(FormBuilder);

  readonly entries = signal<TimeEntry[]>([]);
  readonly activityTypes = signal<ActivityType[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      activityTypeId: this.fb.control<number | null>(null, Validators.required),
      description: ['', [Validators.required, Validators.maxLength(500)]],
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
    },
    { validators: zeroLengthValidator },
  );

  get formatDuration() {
    return formatDuration;
  }

  ngOnInit(): void {
    this.loadTypes();
    this.loadEntries();
  }

  private loadTypes(): void {
    this.typeService.list().subscribe({
      next: (res) => this.activityTypes.set(res.items),
      error: (err: HttpErrorResponse) => this.error.set(this.messageFor(err)),
    });
  }

  loadEntries(): void {
    this.loading.set(true);
    this.error.set(null);
    this.entryService.list().subscribe({
      next: (res) => {
        this.entries.set(res.items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFor(err));
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const write: TimeEntryWrite = {
      activityTypeId: value.activityTypeId as number,
      description: value.description,
      date: value.date,
      startTime: value.startTime,
      endTime: value.endTime,
    };

    this.submitting.set(true);
    this.error.set(null);

    const id = this.editingId();
    const request = id === null ? this.entryService.create(write) : this.entryService.update(id, write);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.resetForm();
        this.loadEntries();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(this.messageFor(err));
      },
    });
  }

  startEdit(entry: TimeEntry): void {
    this.editingId.set(entry.id);
    this.form.setValue({
      activityTypeId: entry.activityType.id,
      description: entry.description,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  remove(entry: TimeEntry): void {
    if (!confirm(`Delete the entry "${entry.description}"?`)) return;
    this.error.set(null);
    this.entryService.delete(entry.id).subscribe({
      next: () => this.loadEntries(),
      error: (err: HttpErrorResponse) => this.error.set(this.messageFor(err)),
    });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      activityTypeId: null,
      description: '',
      date: '',
      startTime: '',
      endTime: '',
    });
  }

  private messageFor(err: HttpErrorResponse): string {
    const body = err.error as ApiErrorBody | undefined;
    return body?.error?.message ?? 'Something went wrong. Please try again.';
  }
}
