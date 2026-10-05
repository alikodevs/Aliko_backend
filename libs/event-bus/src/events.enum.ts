export enum DomainEvents {
  // User events
  USER_REGISTERED = 'user.registered',
  USER_UPDATED = 'user.updated',
  USER_VERIFIED = 'user.verified',

  // Academy events
  COURSE_CREATED = 'course.created',
  COURSE_ENROLLED = 'course.enrolled',
  COHORT_JOINED = 'cohort.joined',
  CERTIFICATE_ISSUED = 'certificate.issued',

  // ConTech events
  PROJECT_CREATED = 'project.created',
  TASK_ASSIGNED = 'task.assigned',
  CONTRACT_SIGNED = 'contract.signed',

  // Events platform events
  EVENT_CREATED = 'event.created',
  TICKET_PURCHASED = 'ticket.purchased',

  // Careers events
  JOB_POSTED = 'job.posted',
  APPLICATION_SUBMITTED = 'application.submitted',

  // Financial events
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_COMPLETED = 'refund.completed',

  // Communication events
  NOTIFICATION_TRIGGERED = 'notification.triggered',
  MESSAGE_SENT = 'message.sent',
}
