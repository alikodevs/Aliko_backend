import { ensureFirebaseAdmin } from '@alikohub/firebase-admin';
import * as admin from 'firebase-admin';

export class PushNotificationService {
  constructor() {
    ensureFirebaseAdmin({ optional: true });
  }

  async sendPushNotification(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    ensureFirebaseAdmin({ optional: true });

    if (!admin.apps.length) {
      console.log(
        `[SIMULATED PUSH] Topic: ${topic}, Title: ${title}, Body: ${body}, Data:`,
        data,
      );
      return {
        success: true,
        message: 'Simulated push notification (development/missing credentials)',
      };
    }

    try {
      const response = await admin.messaging().send({
        topic,
        notification: { title, body },
        data: data || {},
      });
      console.log(
        `[PushNotificationService] Push notification sent to topic "${topic}":`,
        response,
      );
      return { success: true, messageId: response };
    } catch (error: any) {
      console.error(
        `[PushNotificationService] Error sending push notification to topic "${topic}":`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  async sendCourseCreatedNotification(
    title: string,
    courseId: string,
    category?: string,
  ) {
    return this.sendPushNotification(
      'courses',
      `New Course Available: ${title}`,
      `A new course in ${category || 'Academy'} has been published. Enroll now!`,
      { type: 'NEW_COURSE', courseId },
    );
  }

  async sendCohortCreatedNotification(
    cohortName: string,
    courseTitle: string,
    cohortId: string,
    courseId: string,
  ) {
    return this.sendPushNotification(
      'cohorts',
      `New Cohort Open: ${cohortName}`,
      `Registration is now open for the new cohort of "${courseTitle}".`,
      { type: 'NEW_COHORT', cohortId, courseId },
    );
  }

  async sendAnnouncementNotification(
    title: string,
    contentSnippet: string,
    announcementId: string,
  ) {
    return this.sendPushNotification(
      'announcements',
      `New Announcement: ${title}`,
      contentSnippet,
      { type: 'ANNOUNCEMENT', announcementId },
    );
  }
}
