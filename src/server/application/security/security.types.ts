export type UserRole = "customer" | "organizer" | "admin" | "checker";

export interface SecurityActor {
  userId: string;
  role: UserRole;
}

export interface EventManagementAccessInput {
  actor: SecurityActor;
  eventOrganizerId: string;
}
