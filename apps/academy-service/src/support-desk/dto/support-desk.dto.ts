import { SupportTicketCategory, SupportTicketStatus } from '@prisma/client/academy';

export class CreateSupportTicketDto {
  category: SupportTicketCategory;
  subject: string;
  description: string;
  priority?: string;
  attachmentUrl?: string;
  clientDiagnostics?: {
    browser?: string;
    os?: string;
    screenResolution?: string;
    cookiesEnabled?: boolean;
    webRtcSupported?: boolean;
  };
}

export class UpdateSupportTicketDto {
  ticketId: number;
  status?: SupportTicketStatus;
  priority?: string;
  resolution?: string;
}

export class ListSupportTicketsDto {
  category?: SupportTicketCategory;
  status?: SupportTicketStatus;
  priority?: string;
  page?: number;
  limit?: number;
}
