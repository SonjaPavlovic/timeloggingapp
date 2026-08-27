import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivityTypeService } from '../../services/activity-type.service';
import { ActivityType, ApiErrorBody } from '../../models';

@Component({
  imports: [FormsModule],
  selector: 'app-activity-types-page',
  styleUrl: './activity-types-page.css',
  templateUrl: './activity-types-page.html',
})
export class ActivityTypesPage implements OnInit {
  private readonly service = inject(ActivityTypeService);

  readonly types = signal<ActivityType[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly newName = signal('');
  readonly editingId = signal<number | null>(null);
  readonly editingName = signal('');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (res) => {
        this.types.set(res.items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFor(err));
        this.loading.set(false);
      },
    });
  }

  create(): void {
    const name = this.newName().trim();
    if (!name) return;
    this.error.set(null);
    this.service.create(name).subscribe({
      next: () => {
        this.newName.set('');
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFor(err)),
    });
  }

  startEdit(type: ActivityType): void {
    this.editingId.set(type.id);
    this.editingName.set(type.name);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingName.set('');
  }

  saveEdit(id: number): void {
    const name = this.editingName().trim();
    if (!name) return;
    this.error.set(null);
    this.service.update(id, name).subscribe({
      next: () => {
        this.cancelEdit();
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFor(err)),
    });
  }

  remove(id: number): void {
    if (!confirm('Delete this activity type?')) return;
    this.error.set(null);
    this.service.delete(id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => this.error.set(this.messageFor(err)),
    });
  }

  private messageFor(err: HttpErrorResponse): string {
    const body = err.error as ApiErrorBody | undefined;
    if (body?.error?.code === 'IN_USE') {
      return 'This activity type is used by one or more time entries and cannot be deleted.';
    }
    if (body?.error?.code === 'DUPLICATE_NAME') {
      return 'An activity type with that name already exists.';
    }
    return body?.error?.message ?? 'Something went wrong. Please try again.';
  }
}
