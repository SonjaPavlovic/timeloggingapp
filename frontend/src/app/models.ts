export interface ActivityType {
  id: number;
  name: string;
}

export interface TimeEntry {
  id: number;
  activityType: ActivityType;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface TimeEntryWrite {
  activityTypeId: number;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export interface DayTotal {
  date: string;
  totalMinutes: number;
  entryCount: number;
}

export interface ActivityTotal {
  activityTypeId: number;
  activityTypeName: string;
  totalMinutes: number;
  entryCount: number;
}
