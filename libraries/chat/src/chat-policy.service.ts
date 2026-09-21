import { Injectable } from '@nestjs/common';
import { CanStartDirectChatInput } from './types';

const CHAT_ENABLED_ROLES = new Set(['STUDENT', 'INSTRUCTOR', 'ADMIN']);

const CROSS_ROLE_PAIRS = new Set([
  'ADMIN:INSTRUCTOR',
  'ADMIN:STUDENT',
  'INSTRUCTOR:STUDENT',
]);

function normalizeRole(role: string): string {
  return (role || '').toUpperCase();
}

function unorderedPairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

/** Role-level gate: cross-role academy pairs + optional same-role DMs */
export function isAllowedRolePair(roleA: string, roleB: string): boolean {
  const a = normalizeRole(roleA);
  const b = normalizeRole(roleB);
  if (!CHAT_ENABLED_ROLES.has(a) || !CHAT_ENABLED_ROLES.has(b)) {
    return false;
  }
  // Same-role DMs are allowed (optional; not restricted)
  if (a === b) {
    return true;
  }
  return CROSS_ROLE_PAIRS.has(unorderedPairKey(a, b));
}

/** Student ↔ instructor requires an enrollment link; other allowed pairs do not */
export function requiresEnrollmentLink(roleA: string, roleB: string): boolean {
  const roles = new Set([normalizeRole(roleA), normalizeRole(roleB)]);
  return roles.has('STUDENT') && roles.has('INSTRUCTOR');
}

@Injectable()
export class ChatPolicyService {
  isAllowedRolePair(roleA: string, roleB: string): boolean {
    return isAllowedRolePair(roleA, roleB);
  }

  requiresEnrollmentLink(roleA: string, roleB: string): boolean {
    return requiresEnrollmentLink(roleA, roleB);
  }

  canStartDirectChat(input: CanStartDirectChatInput): boolean {
    const { senderRole, recipientRole, hasEnrollmentLink = false } = input;
    if (!isAllowedRolePair(senderRole, recipientRole)) {
      return false;
    }
    if (requiresEnrollmentLink(senderRole, recipientRole) && !hasEnrollmentLink) {
      return false;
    }
    return true;
  }
}
