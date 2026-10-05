export interface ServiceHealthDto {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  uptime: number;
  timestamp: string;
}

export interface UserSummaryDto {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
}
