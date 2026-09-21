import { PushNotificationService } from './notification.service';

jest.mock('@alikohub/firebase-admin', () => ({
  ensureFirebaseAdmin: jest.fn(() => false),
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  messaging: () => ({
    send: jest.fn(),
  }),
}));

describe('@alikohub/notification PushNotificationService', () => {
  it('simulates push when firebase is unavailable', async () => {
    const service = new PushNotificationService();
    const result = await service.sendPushNotification(
      'courses',
      'Title',
      'Body',
      { type: 'NEW_COURSE', courseId: '1' },
    );
    expect(result.success).toBe(true);
    expect((result as any).message).toMatch(/Simulated/i);
  });

  it('sends course/cohort/announcement helpers', async () => {
    const service = new PushNotificationService();
    await expect(
      service.sendCourseCreatedNotification('Nest Basics', '42', 'Backend'),
    ).resolves.toMatchObject({ success: true });
    await expect(
      service.sendCohortCreatedNotification('C1', 'Nest Basics', '9', '42'),
    ).resolves.toMatchObject({ success: true });
    await expect(
      service.sendAnnouncementNotification('Note', 'Hello', '7'),
    ).resolves.toMatchObject({ success: true });
  });
});
