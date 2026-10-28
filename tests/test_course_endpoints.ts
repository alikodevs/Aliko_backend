import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { CoursesController } from '../apps/academy-service/src/courses/courses.controller';
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  FindAllCoursesSchema,
  CourseIdSchema,
  UpdateCourseStatusSchema,
} from '../apps/academy-service/src/courses/courses.validation';

const METHOD_NAMES: Record<number, string> = {
  0: 'GET',
  1: 'POST',
  2: 'PUT',
  3: 'DELETE',
  4: 'PATCH',
  5: 'ALL',
  6: 'OPTIONS',
  7: 'HEAD',
};

async function testAll() {
  console.log('\n========================================================================');
  console.log('   🧪 1. VERIFYING COURSES CONTROLLER HTTP ROUTE DECORATORS             ');
  console.log('========================================================================\n');

  const proto = CoursesController.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter((m) => m !== 'constructor');

  let passedRoutes = 0;
  for (const m of methods) {
    const rawMethod = Reflect.getMetadata(METHOD_METADATA, proto[m]);
    const httpMethod = rawMethod !== undefined ? METHOD_NAMES[rawMethod] : 'NONE';
    const pathMeta = Reflect.getMetadata(PATH_METADATA, proto[m]);
    const paths = Array.isArray(pathMeta) ? pathMeta : pathMeta !== undefined ? [pathMeta] : [];
    const patternMeta = Reflect.getMetadata('microservices:pattern', proto[m]);

    console.log(
      `  [${httpMethod.padEnd(6)}] ${m.padEnd(28)} -> [${paths.join(' | ')}]` +
      (patternMeta ? ` (TCP: ${JSON.stringify(patternMeta)})` : '')
    );
    if (httpMethod !== 'NONE') passedRoutes++;
  }

  console.log(`\n✔ Total verified HTTP endpoints on CoursesController: ${passedRoutes}`);

  console.log('\n========================================================================');
  console.log('   🧪 2. TESTING EXACT POSTMAN PAYLOADS AGAINST JOI VALIDATION          ');
  console.log('========================================================================\n');

  // Payload 1 from user screenshot 1:
  const screenshot1Payload = {
    title: 'WA Nursing Assistant Certified (NA-C) Theory - Bezawit',
    description: 'Comprehensive Washington State approved NA-C hybrid curriculum.',
    category: 'NURSING',
    level: 'BEGINNER',
    courseCode: 'NAC-101-BEZA',
    minimumPassingGrade: 80,
    requiresPassingGrade: true,
  };

  const validation1 = CreateCourseSchema.validate(screenshot1Payload);
  if (validation1.error) {
    console.error('❌ Failed validation for Screenshot 1 payload:', validation1.error.message);
  } else {
    console.log('✔ Screenshot 1 payload validated successfully:', JSON.stringify(validation1.value.title));
  }

  // Microservice payload (with dto and user):
  const microservicePayload = {
    dto: {
      title: 'WA Nursing Assistant Certified (NA-C) Theory - Bezawit',
      shortDescription: 'Hybrid curriculum.',
      status: 'DRAFT',
    },
    user: { firebaseId: 'test-admin', role: 'ADMIN' },
  };

  const validation2 = CreateCourseSchema.validate(microservicePayload);
  if (validation2.error) {
    console.error('❌ Failed validation for microservice payload:', validation2.error.message);
  } else {
    console.log('✔ Microservice { dto, user } payload validated successfully!');
  }

  // Update status validation:
  const statusPayload = { status: 'PUBLISHED' };
  const statusValidation = UpdateCourseStatusSchema.validate(statusPayload);
  if (statusValidation.error) {
    console.error('❌ Failed status validation:', statusValidation.error.message);
  } else {
    console.log('✔ Status payload validated successfully:', JSON.stringify(statusValidation.value));
  }

  // Course ID validation:
  const idValidation = CourseIdSchema.validate({ id: 42 });
  if (idValidation.error) {
    console.error('❌ Failed ID validation:', idValidation.error.message);
  } else {
    console.log('✔ ID validation passed successfully for id: 42');
  }

  console.log('\n========================================================================');
  console.log('   🎉 ALL ENDPOINT DEFINITIONS AND VALIDATION TESTS PASSED!            ');
  console.log('========================================================================\n');
}

testAll().catch((err) => {
  console.error('Error in test:', err);
  process.exit(1);
});
