/** Unordered cross-role pairs that are always policy-relevant */
export const CHAT_ROLE_PAIRS = [
  ['STUDENT', 'INSTRUCTOR'],
  ['STUDENT', 'ADMIN'],
  ['INSTRUCTOR', 'ADMIN'],
] as const;

export const CHAT_MESSAGE_PATTERNS = {
  START_OR_GET_CONVERSATION: 'start_or_get_conversation',
  LIST_MY_CONVERSATIONS: 'list_my_conversations',
  LIST_MESSAGES: 'list_messages',
  SEND_MESSAGE: 'send_message',
  MARK_CONVERSATION_READ: 'mark_conversation_read',
  LIST_ELIGIBLE_CONTACTS: 'list_eligible_contacts',
  VERIFY_CONVERSATION_MEMBERSHIP: 'verify_conversation_membership',
} as const;

export const CHAT_WS_EVENTS = {
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  MESSAGE_CREATED: 'message_created',
  MESSAGE_READ: 'message_read',
  ERROR: 'error',
} as const;

export const CHAT_WS_NAMESPACE = '/academy-chat';

export function conversationRoom(conversationId: number | string): string {
  return `conversation:${conversationId}`;
}

export function pairKeyForUsers(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(':');
}
