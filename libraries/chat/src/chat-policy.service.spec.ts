import {
  ChatPolicyService,
  isAllowedRolePair,
  requiresEnrollmentLink,
} from './chat-policy.service';

describe('@alikohub/chat ChatPolicyService', () => {
  const policy = new ChatPolicyService();

  it('allows student-instructor, student-admin, instructor-admin pairs', () => {
    expect(isAllowedRolePair('STUDENT', 'INSTRUCTOR')).toBe(true);
    expect(isAllowedRolePair('STUDENT', 'ADMIN')).toBe(true);
    expect(isAllowedRolePair('INSTRUCTOR', 'ADMIN')).toBe(true);
  });

  it('allows same-role DMs optionally', () => {
    expect(isAllowedRolePair('STUDENT', 'STUDENT')).toBe(true);
    expect(isAllowedRolePair('INSTRUCTOR', 'INSTRUCTOR')).toBe(true);
    expect(isAllowedRolePair('ADMIN', 'ADMIN')).toBe(true);
  });

  it('rejects roles outside chat-enabled set', () => {
    expect(isAllowedRolePair('USER', 'STUDENT')).toBe(false);
    expect(isAllowedRolePair('COURSE_MANAGER', 'ADMIN')).toBe(false);
  });

  it('requires enrollment only for student-instructor', () => {
    expect(requiresEnrollmentLink('STUDENT', 'INSTRUCTOR')).toBe(true);
    expect(requiresEnrollmentLink('STUDENT', 'ADMIN')).toBe(false);
    expect(requiresEnrollmentLink('INSTRUCTOR', 'ADMIN')).toBe(false);
    expect(requiresEnrollmentLink('STUDENT', 'STUDENT')).toBe(false);
  });

  it('blocks student-instructor without enrollment link', () => {
    expect(
      policy.canStartDirectChat({
        senderRole: 'STUDENT',
        recipientRole: 'INSTRUCTOR',
        hasEnrollmentLink: false,
      }),
    ).toBe(false);
  });

  it('allows student-instructor with enrollment link', () => {
    expect(
      policy.canStartDirectChat({
        senderRole: 'INSTRUCTOR',
        recipientRole: 'STUDENT',
        hasEnrollmentLink: true,
      }),
    ).toBe(true);
  });

  it('allows student-admin without enrollment', () => {
    expect(
      policy.canStartDirectChat({
        senderRole: 'STUDENT',
        recipientRole: 'ADMIN',
        hasEnrollmentLink: false,
      }),
    ).toBe(true);
  });
});
