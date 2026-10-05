export type ChatRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'USER' | 'COURSE_MANAGER';

export type ChatParticipant = {
  userId: string;
  role: ChatRole | string;
};

export type StartConversationInput = {
  recipientId: string;
  courseId?: number;
};

export type SendMessageInput = {
  conversationId: number;
  body: string;
};

export type CanStartDirectChatInput = {
  senderRole: string;
  recipientRole: string;
  /** True when student has an ACTIVE enrollment on a course owned by the instructor */
  hasEnrollmentLink?: boolean;
};
