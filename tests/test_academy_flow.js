/**
 * Comprehensive Academic Domain Flow Test
 * Tests every endpoint and the complete academic flow in academy-service.
 */

const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');

const TCP_PORT = parseInt(process.env.ACADEMY_TCP_PORT || '3015', 10);
const HOST = '127.0.0.1';

const client = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: { host: HOST, port: TCP_PORT },
});

const randSuffix = Math.floor(1000 + Math.random() * 9000);

const adminUser = {
  firebaseId: `admin-flow-${randSuffix}`,
  email: `admin-${randSuffix}@example.com`,
  firstname: 'Academy',
  lastname: 'Admin',
  role: 'ADMIN',
  globalRole: 'ADMIN',
  status: 'ACTIVE',
};

const instructorUser = {
  firebaseId: `instructor-flow-${randSuffix}`,
  email: `instructor-${randSuffix}@example.com`,
  firstname: 'John',
  lastname: 'Instructor',
  role: 'INSTRUCTOR',
  globalRole: 'USER',
  activeRole: 'INSTRUCTOR',
  status: 'ACTIVE',
};

const studentUser = {
  firebaseId: `student-flow-${randSuffix}`,
  email: `student-${randSuffix}@example.com`,
  firstname: 'Alice',
  lastname: 'Student',
  role: 'STUDENT',
  globalRole: 'USER',
  activeRole: 'STUDENT',
  status: 'ACTIVE',
};

const results = [];

async function callEndpoint(cmd, payload, description) {
  const cmdName = typeof cmd === 'string' ? cmd : cmd.cmd;
  const label = description || cmdName;
  process.stdout.write(`  ▶ ${label.padEnd(55)} ... `);
  try {
    const observable = client.send(cmd, payload).pipe(timeout(10000));
    const response = await firstValueFrom(observable);
    console.log(`\x1b[32m✔ OK\x1b[0m`);
    results.push({ cmd: cmdName, description: label, status: 'PASSED', data: response });
    return response;
  } catch (err) {
    const errorMsg = err.message || JSON.stringify(err);
    console.log(`\x1b[31m✖ FAIL (${errorMsg})\x1b[0m`);
    results.push({ cmd: cmdName, description: label, status: 'FAILED', error: errorMsg });
    return null;
  }
}

async function run() {
  console.log('\n========================================================================');
  console.log(`  🎓 ACADEMY SERVICE: COMPLETE DOMAIN FLOW & ENDPOINT VERIFICATION`);
  console.log(`  TCP Port: ${TCP_PORT} | Host: ${HOST}`);
  console.log('========================================================================\n');

  // Shared state across flow phases
  let courseId = null;
  let moduleId = null;
  let lessonId = null;
  let contentId = null;
  let exerciseId = null;
  let cohortId = null;
  let enrollmentId = null;
  let submissionId = null;
  let scheduleId = null;
  let announcementId = null;
  let notificationId = null;
  let conversationId = null;

  // -------------------------------------------------------------------------
  // PHASE 1: User Profiles & Academy Role Selection
  // -------------------------------------------------------------------------
  console.log('\x1b[1m\x1b[34m[PHASE 1] Profiles & Role Selection\x1b[0m');
  await callEndpoint({ cmd: 'get_academy_profile' }, { user: adminUser }, 'Get/Init Admin Profile');
  await callEndpoint({ cmd: 'get_academy_profile' }, { user: instructorUser }, 'Get/Init Instructor Profile');
  await callEndpoint({ cmd: 'get_academy_profile' }, { user: studentUser }, 'Get/Init Student Profile');

  await callEndpoint({ cmd: 'select_academy_role' }, {
    userId: instructorUser.firebaseId,
    role: 'INSTRUCTOR',
    user: instructorUser,
  }, 'Instructor selects INSTRUCTOR role');

  await callEndpoint({ cmd: 'select_academy_role' }, {
    userId: studentUser.firebaseId,
    role: 'STUDENT',
    user: studentUser,
  }, 'Student selects STUDENT role');

  // -------------------------------------------------------------------------
  // PHASE 2: Course Creation & Curriculum Authoring
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m\x1b[34m[PHASE 2] Course & Curriculum Authoring\x1b[0m');
  const courseRes = await callEndpoint({ cmd: 'create_course' }, {
    dto: {
      title: `Full-Stack Architecture ${randSuffix}`,
      shortDescription: 'Master modern microservices and clean architecture',
      longDescription: 'A comprehensive curriculum covering NestJS, PostgreSQL, Prisma, RabbitMQ and Docker.',
      status: 'DRAFT',
      category: 'Software Engineering',
      targetLevel: 'Intermediate',
      price: 99.99,
      priceInUsd: 99.99,
      skills: ['NestJS', 'PostgreSQL', 'Microservices'],
      conceptsLearned: ['Clean Architecture', 'Event-Driven Systems'],
      outcomes: ['Build enterprise apps', 'Deploy microservices'],
      estimatedTime: 40,
      createDefaultCohort: false,
    },
    user: instructorUser,
  }, 'Instructor creates draft course');

  if (courseRes && courseRes.id) {
    courseId = courseRes.id;
  }

  if (courseId) {
    await callEndpoint({ cmd: 'find_all_courses' }, { query: { page: 1, limit: 10 } }, 'Find all courses (public catalog)');
    await callEndpoint({ cmd: 'find_course_by_id' }, { id: courseId, user: instructorUser }, 'Find course by ID');
    await callEndpoint({ cmd: 'get_my_draft_courses' }, { user: instructorUser }, 'Get instructor draft courses');

    await callEndpoint({ cmd: 'update_course' }, {
      id: courseId,
      dto: {
        shortDescription: 'Updated: Master modern cloud architectures and distributed systems',
        price: 89.99,
      },
      user: instructorUser,
    }, 'Update course details');

    // Modules
    const moduleRes = await callEndpoint({ cmd: 'create_course_module' }, {
      dto: {
        title: 'Module 1: Foundations of Microservices',
        description: 'Introduction to decoupling, IPC, and event brokers',
        courseId: courseId,
      },
      user: instructorUser,
    }, 'Create course module');

    if (moduleRes && moduleRes.id) {
      moduleId = moduleRes.id;
    }

    if (moduleId) {
      await callEndpoint({ cmd: 'find_all_modules' }, { user: adminUser }, 'Find all modules');
      await callEndpoint({ cmd: 'find_modules_by_course' }, { courseId: courseId, user: instructorUser }, 'Find modules by course');
      await callEndpoint({ cmd: 'find_module_by_id' }, { id: moduleId, user: instructorUser }, 'Find module by ID');
      await callEndpoint({ cmd: 'get_instructor_module' }, { id: moduleId, user: instructorUser }, 'Get instructor module view');
      await callEndpoint({ cmd: 'update_course_module' }, {
        id: moduleId,
        dto: { description: 'Updated foundations with real-world examples' },
        user: instructorUser,
      }, 'Update course module');

      // Lessons
      const lessonRes = await callEndpoint({ cmd: 'create_lesson' }, {
        dto: {
          title: 'Lesson 1.1: Event-Driven Architecture Overview',
          type: 'VIDEO',
          moduleId: moduleId,
          order: 1,
        },
        user: instructorUser,
      }, 'Create lesson in module');

      if (lessonRes && lessonRes.id) {
        lessonId = lessonRes.id;
      }

      if (lessonId) {
        await callEndpoint({ cmd: 'find_lessons_by_module' }, { moduleId: moduleId, user: instructorUser }, 'Find lessons by module');
        await callEndpoint({ cmd: 'find_instructor_lessons' }, { user: instructorUser }, 'Find instructor lessons');
        await callEndpoint({ cmd: 'find_lesson_by_id' }, { id: lessonId, user: instructorUser }, 'Find lesson by ID');
        await callEndpoint({ cmd: 'update_lesson' }, {
          id: lessonId,
          dto: { title: 'Lesson 1.1: Deep Dive into Event-Driven Systems' },
          user: instructorUser,
        }, 'Update lesson');

        // Content
        const contentRes = await callEndpoint({ cmd: 'create_content' }, {
          dto: {
            title: 'Event-Driven Systems Slide Deck',
            type: 'VIDEO',
            url: 'https://cdn.example.com/videos/event-driven.mp4',
            body: 'Detailed presentation slides covering EDA patterns.',
            lessonId: lessonId,
          },
          user: instructorUser,
        }, 'Create lesson content');

        if (contentRes && contentRes.id) {
          contentId = contentRes.id;
        }

        if (contentId) {
          await callEndpoint({ cmd: 'find_all_content' }, { user: adminUser }, 'Find all content');
          await callEndpoint({ cmd: 'find_content_by_lesson' }, { lessonId: lessonId, user: instructorUser }, 'Find content by lesson');
          await callEndpoint({ cmd: 'find_content_by_course' }, { courseId: courseId, user: adminUser }, 'Find content by course');
          await callEndpoint({ cmd: 'find_content_by_id' }, { id: contentId, user: instructorUser }, 'Find content by ID');
          await callEndpoint({ cmd: 'search_content' }, { query: 'Slide Deck', user: instructorUser }, 'Search content');
          await callEndpoint({ cmd: 'update_content' }, {
            id: contentId,
            dto: { title: 'Updated Event-Driven Systems Slide Deck v2' },
            user: instructorUser,
          }, 'Update content');
        }

        // Exercises
        const exerciseRes = await callEndpoint({ cmd: 'create_exercise' }, {
          dto: {
            title: 'Quiz 1: Message Broker Concepts',
            description: 'Test your understanding of RabbitMQ exchanges and queues',
            moduleId: moduleId,
            lessonId: lessonId,
            type: 'MULTIPLE_CHOICE',
            question: 'Which exchange type routes messages to all bound queues unconditionally?',
            options: ['direct', 'fanout', 'topic', 'headers'],
            correctAnswer: 'fanout',
            points: 10,
            order: 1,
          },
          user: instructorUser,
        }, 'Create exercise / quiz');

        if (exerciseRes && exerciseRes.id) {
          exerciseId = exerciseRes.id;
        }

        if (exerciseId) {
          await callEndpoint({ cmd: 'find_exercises_by_module' }, { moduleId: moduleId, user: instructorUser }, 'Find exercises by module');
          await callEndpoint({ cmd: 'find_instructor_exercises' }, { user: instructorUser }, 'Find instructor exercises');
          await callEndpoint({ cmd: 'find_exercise_by_id' }, { id: exerciseId, user: instructorUser }, 'Find exercise by ID');
          await callEndpoint({ cmd: 'update_exercise' }, {
            id: exerciseId,
            dto: { points: 15 },
            user: instructorUser,
          }, 'Update exercise points');
        }

        // Bulk Exercises
        await callEndpoint({ cmd: 'create_bulk_exercises' }, {
          dtos: [
            {
              title: 'Quiz 2: True/False',
              moduleId: moduleId,
              lessonId: lessonId,
              type: 'TRUE_FALSE',
              question: 'TCP is connection-oriented.',
              options: ['true', 'false'],
              correctAnswer: 'true',
              points: 5,
            },
          ],
          user: instructorUser,
        }, 'Create bulk exercises');
      }
    }

    // -------------------------------------------------------------------------
    // PHASE 3: Course Approval & Publishing
    // -------------------------------------------------------------------------
    console.log('\n\x1b[1m\x1b[34m[PHASE 3] Course Review & Publishing\x1b[0m');
    await callEndpoint({ cmd: 'submit_course_for_approval' }, { id: courseId, user: instructorUser }, 'Submit course for approval');
    await callEndpoint({ cmd: 'approve_course' }, { id: courseId, user: adminUser }, 'Admin approves course');
    await callEndpoint({ cmd: 'update_course_status' }, { id: courseId, status: 'PUBLISHED', user: instructorUser }, 'Publish course');
    await callEndpoint({ cmd: 'get_course_with_structure' }, { id: courseId, user: instructorUser }, 'Get course full structure');
    await callEndpoint({ cmd: 'get_instructor_courses_with_stats' }, { user: instructorUser }, 'Get instructor courses with stats');

    // -------------------------------------------------------------------------
    // PHASE 4: Cohorts & Teaching Schedule
    // -------------------------------------------------------------------------
    console.log('\n\x1b[1m\x1b[34m[PHASE 4] Cohorts & Teaching Schedule\x1b[0m');
    const startDate = new Date();
    const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const cohortRes = await callEndpoint({ cmd: 'create_cohort' }, {
      dto: {
        name: `Cohort Alfa-${randSuffix}`,
        courseId: courseId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        maxCapacity: 30,
      },
      user: instructorUser,
    }, 'Create cohort for course');

    if (cohortRes && cohortRes.id) {
      cohortId = cohortRes.id;
    }

    if (cohortId) {
      await callEndpoint({ cmd: 'find_all_cohorts' }, { user: adminUser }, 'Find all cohorts');
      await callEndpoint({ cmd: 'find_cohort_by_id' }, { id: cohortId, user: instructorUser }, 'Find cohort by ID');
      await callEndpoint({ cmd: 'find_instructor_cohorts' }, { user: instructorUser }, 'Find instructor cohorts');
      await callEndpoint({ cmd: 'update_cohort' }, {
        id: cohortId,
        dto: { maxCapacity: 45 },
        user: instructorUser,
      }, 'Update cohort capacity');

      // Teaching Schedule
      const schedRes = await callEndpoint({ cmd: 'create_teaching_schedule' }, {
        schedule: {
          courseId: courseId,
          cohortId: cohortId,
          title: 'Live Lab: Event Architecture Walkthrough',
          description: 'Hands-on coding session with instructors',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          type: 'LIVE',
          isRecurring: false,
        },
        user: instructorUser,
      }, 'Create teaching schedule session');

      if (schedRes && (schedRes.id || schedRes.scheduleId)) {
        scheduleId = schedRes.id || schedRes.scheduleId;
      }

      await callEndpoint({ cmd: 'get_instructor_schedules' }, { user: instructorUser }, 'Get instructor schedule calendar');
      await callEndpoint({ cmd: 'get_course_schedules' }, { courseId: courseId, user: instructorUser }, 'Get schedules for course');

      if (scheduleId) {
        await callEndpoint({ cmd: 'get_teaching_schedule' }, { scheduleId: scheduleId, user: instructorUser }, 'Get specific teaching schedule');
        await callEndpoint({ cmd: 'update_teaching_schedule' }, {
          scheduleId: scheduleId,
          updateData: { title: 'Updated Live Lab Session' },
          user: instructorUser,
        }, 'Update teaching schedule');
      }
    }

    // -------------------------------------------------------------------------
    // PHASE 5: Student Enrollment & Learning Flow
    // -------------------------------------------------------------------------
    console.log('\n\x1b[1m\x1b[34m[PHASE 5] Student Enrollment & Learning Lifecycle\x1b[0m');
    const enrollRes = await callEndpoint({ cmd: 'create_enrollment' }, {
      dto: {
        courseId: courseId,
        cohortId: cohortId,
        userId: studentUser.firebaseId,
      },
      user: adminUser,
    }, 'Student enrolls into course');

    if (enrollRes && enrollRes.id) {
      enrollmentId = enrollRes.id;
    }

    await callEndpoint({ cmd: 'find_all_enrollments' }, { user: adminUser }, 'Find all enrollments (Admin)');
    await callEndpoint({ cmd: 'find_my_enrollments' }, { user: studentUser }, 'Find my enrollments (Student)');
    await callEndpoint({ cmd: 'find_enrollments_by_user' }, { userId: studentUser.firebaseId, user: adminUser }, 'Find enrollments by user');
    await callEndpoint({ cmd: 'find_enrollments_by_course' }, { courseId: courseId, user: instructorUser }, 'Find enrollments by course');
    await callEndpoint({ cmd: 'find_instructor_enrollments' }, { user: instructorUser }, 'Find instructor enrollments');

    if (cohortId) {
      await callEndpoint({ cmd: 'find_enrollments_by_cohort' }, { cohortId: cohortId, user: instructorUser }, 'Find enrollments by cohort');
    }

    // Progress updates
    if (contentId && lessonId && moduleId) {
      await callEndpoint({ cmd: 'update_content_progress' }, {
        courseId: courseId,
        moduleId: moduleId,
        lessonId: lessonId,
        contentId: contentId,
        status: 'COMPLETED',
        user: studentUser,
      }, 'Student updates content progress');
    }

    if (lessonId) {
      await callEndpoint({ cmd: 'complete_lesson' }, {
        courseId: courseId,
        lessonId: lessonId,
        user: studentUser,
      }, 'Student completes lesson');

      await callEndpoint({ cmd: 'get_lesson_status' }, {
        courseId: courseId,
        lessonId: lessonId,
        user: studentUser,
      }, 'Check lesson completion status');
    }

    // Exercise submission & grading
    if (exerciseId) {
      const submitRes = await callEndpoint({ cmd: 'submit_exercise' }, {
        id: exerciseId,
        dto: {
          answer: 'fanout',
          submissionTime: new Date().toISOString(),
        },
        user: studentUser,
      }, 'Student submits exercise answer');

      if (submitRes && submitRes.id) {
        submissionId = submitRes.id;
      }

      await callEndpoint({ cmd: 'find_instructor_submissions' }, {
        query: { courseId: courseId },
        user: instructorUser,
      }, 'Instructor lists pending submissions');

      if (submissionId) {
        await callEndpoint({ cmd: 'grade_exercise' }, {
          id: submissionId,
          dto: {
            isCorrect: true,
            score: 15,
            feedback: 'Perfect understanding of fanout exchanges!',
          },
          user: instructorUser,
        }, 'Instructor grades student submission');
      }
    }

    // -------------------------------------------------------------------------
    // PHASE 6: Analytics & Dashboards
    // -------------------------------------------------------------------------
    console.log('\n\x1b[1m\x1b[34m[PHASE 6] Progress, Analytics & Dashboards\x1b[0m');
    await callEndpoint({ cmd: 'get_user_progress' }, {
      targetUserId: studentUser.firebaseId,
      courseId: courseId,
      user: studentUser,
    }, 'Get user course progress');

    await callEndpoint({ cmd: 'get_students_progress_for_course' }, {
      courseId: courseId,
      user: instructorUser,
    }, 'Get students progress for course');

    await callEndpoint({ cmd: 'get_detailed_student_progress' }, {
      courseId: courseId,
      targetUserId: studentUser.firebaseId,
      user: instructorUser,
    }, 'Get detailed student progress');

    await callEndpoint({ cmd: 'get_student_stats' }, {
      user: studentUser,
    }, 'Get student stats');

    await callEndpoint({ cmd: 'get_recommended_next_lesson' }, {
      courseId: courseId,
      user: studentUser,
    }, 'Get recommended next lesson');

    await callEndpoint({ cmd: 'get_my_dashboard' }, { user: studentUser }, 'Get student dashboard');
    await callEndpoint({ cmd: 'get_instructor_dashboard' }, { user: instructorUser }, 'Get instructor dashboard');
    await callEndpoint({ cmd: 'get_instructor_stats' }, { user: instructorUser }, 'Get instructor stats');
    await callEndpoint({ cmd: 'get_course_analytics' }, { courseId: courseId, user: instructorUser }, 'Get course analytics');
    await callEndpoint({ cmd: 'get_overall_analytics' }, { user: adminUser }, 'Get academy overall analytics (Admin)');

    // -------------------------------------------------------------------------
    // PHASE 7: Announcements & Notifications
    // -------------------------------------------------------------------------
    console.log('\n\x1b[1m\x1b[34m[PHASE 7] Announcements & Notifications\x1b[0m');
    const annRes = await callEndpoint({ cmd: 'create_announcement' }, {
      dto: {
        title: 'Welcome to the Microservices Course!',
        content: 'Please make sure to review the prerequisites and set up Docker.',
      },
      user: instructorUser,
    }, 'Create course announcement');

    if (annRes && annRes.id) {
      announcementId = annRes.id;
    }

    await callEndpoint({ cmd: 'find_all_announcements' }, { query: {}, user: studentUser }, 'Find all announcements');

    if (announcementId) {
      await callEndpoint({ cmd: 'find_announcement_by_id' }, { id: announcementId, user: studentUser }, 'Find announcement by ID');
      await callEndpoint({ cmd: 'update_announcement' }, {
        id: announcementId,
        dto: { title: 'Updated: Welcome to Microservices 2026!' },
        user: instructorUser,
      }, 'Update announcement');
    }

    // Notifications
    const notifRes = await callEndpoint({ cmd: 'create_notification' }, {
      dto: {
        userId: studentUser.firebaseId,
        message: 'Your assignment has been graded!',
        type: 'COURSE_UPDATE',
      },
      user: instructorUser,
    }, 'Create student notification');

    if (notifRes && notifRes.id) {
      notificationId = notifRes.id;
    }

    await callEndpoint({ cmd: 'get_my_notifications' }, { user: studentUser }, 'Student gets notifications');

    if (notificationId) {
      await callEndpoint({ cmd: 'get_notification_by_id' }, { id: notificationId, user: studentUser }, 'Get notification by ID');
      await callEndpoint({ cmd: 'mark_notification_read' }, { id: notificationId, user: studentUser }, 'Mark notification as read');
    }

    await callEndpoint({ cmd: 'internal_create_progress_notification' }, {
      userId: studentUser.firebaseId,
      message: 'Great job completing Module 1!',
    }, 'Internal system progress notification');

    if (moduleId) {
      await callEndpoint({ cmd: 'internal_notify_instructor' }, {
        studentId: studentUser.firebaseId,
        courseId: courseId,
        moduleTitle: 'Module 1: Foundations',
      }, 'Internal notify instructor on completion');
    }

    // -------------------------------------------------------------------------
    // PHASE 8: Chat & Messaging
    // -------------------------------------------------------------------------
    console.log('\n\x1b[1m\x1b[34m[PHASE 8] Direct Chat & In-App Messaging\x1b[0m');
    await callEndpoint({ cmd: 'list_eligible_contacts' }, { user: studentUser }, 'List eligible contacts for chat');

    const convRes = await callEndpoint({ cmd: 'start_or_get_conversation' }, {
      dto: { recipientId: instructorUser.firebaseId },
      user: studentUser,
    }, 'Student starts chat conversation with instructor');

    if (convRes && convRes.id) {
      conversationId = convRes.id;
    }

    if (conversationId) {
      await callEndpoint({ cmd: 'send_message' }, {
        dto: {
          conversationId: conversationId,
          content: 'Hello Instructor! I have a question about the assignment.',
        },
        user: studentUser,
      }, 'Student sends chat message');

      await callEndpoint({ cmd: 'list_messages' }, {
        conversationId: conversationId,
        user: studentUser,
      }, 'List messages in conversation');

      await callEndpoint({ cmd: 'mark_conversation_read' }, {
        conversationId: conversationId,
        user: instructorUser,
      }, 'Instructor marks conversation as read');

      await callEndpoint({ cmd: 'list_my_conversations' }, { user: studentUser }, 'List student conversations');
    }

    // -------------------------------------------------------------------------
    // PHASE 9: Teardown & Lifecycle Cleanup
    // -------------------------------------------------------------------------
    console.log('\n\x1b[1m\x1b[34m[PHASE 9] Teardown & Lifecycle Cleanup\x1b[0m');
    if (notificationId) {
      await callEndpoint({ cmd: 'delete_notification' }, { id: notificationId, user: adminUser }, 'Delete notification');
    }

    if (exerciseId) {
      await callEndpoint({ cmd: 'remove_exercise' }, { id: exerciseId, user: instructorUser }, 'Remove exercise');
    }

    if (contentId) {
      await callEndpoint({ cmd: 'remove_content' }, { id: contentId, user: instructorUser }, 'Remove content');
    }

    if (lessonId) {
      await callEndpoint({ cmd: 'remove_lesson' }, { id: lessonId, user: instructorUser }, 'Remove lesson');
    }

    if (moduleId) {
      await callEndpoint({ cmd: 'remove_course_module' }, { id: moduleId, user: instructorUser }, 'Remove course module');
    }

    if (scheduleId) {
      await callEndpoint({ cmd: 'delete_teaching_schedule' }, { scheduleId: scheduleId, user: instructorUser }, 'Delete teaching schedule');
    }

    if (announcementId) {
      await callEndpoint({ cmd: 'remove_announcement' }, { id: announcementId, user: instructorUser }, 'Remove announcement');
    }

    if (enrollmentId) {
      await callEndpoint({ cmd: 'remove_enrollment' }, { id: enrollmentId, user: adminUser }, 'Remove enrollment');
    }

    if (cohortId) {
      await callEndpoint({ cmd: 'remove_cohort' }, { id: cohortId, user: adminUser }, 'Remove cohort');
    }

    await callEndpoint({ cmd: 'remove_course' }, { id: courseId, user: adminUser }, 'Remove course (Admin cleanup)');
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY REPORT
  // -------------------------------------------------------------------------
  await client.close();

  console.log('\n========================================================================');
  console.log('  📊 ACADEMY DOMAIN FLOW TEST SUMMARY');
  console.log('========================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  console.log(`  Total Endpoints Tested: ${total}`);
  console.log(`  Passed:                 \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed:                 ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
  console.log(`  Pass Rate:              ${((passed / total) * 100).toFixed(1)}%`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.log('❌ Failed Endpoints:');
    results
      .filter((r) => r.status === 'FAILED')
      .forEach((r) => console.log(`   - [${r.cmd}] ${r.description}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL ACADEMIC ENDPOINTS AND THE ENTIRE DOMAIN FLOW PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
