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

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
