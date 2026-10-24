export type RequestStatus = "Pending" | "Accepted" | "Declined";

export type PatientMood = "Improving" | "Stable" | "Needs attention";

export type CalendarEventStatus = "Free" | "Pending" | "Accepted" | "Completed";

export type CalendarView = "Week" | "Day";

export type DashboardDialog = "hours" | "availability" | null;

export interface PatientRequest {
  id: number;
  name: string;
  initials: string;
  age: number;
  date: string;
  time: string;
  returningPatient: boolean;
  status: RequestStatus;
  color: string;
}

export interface Patient {
  id: number;
  name: string;
  initials: string;
  nextSession: string;
  shared: string[];
  actionsDone: number;
  actionsTotal: number;
  mood: PatientMood;
  color: string;
}

export interface CalendarEvent {
  id: number;
  day: number;
  date?: string;
  start: number;
  duration: number;
  title: string;
  subtitle: string;
  status: CalendarEventStatus;
}

export interface AvailabilityForm {
  date: string;
  time: string;
}
