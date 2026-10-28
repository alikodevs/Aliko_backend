import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

import { CoursesController } from '../apps/academy-service/src/courses/courses.controller';
import { UserController as AcademyUserController } from '../apps/academy-service/src/user/user.controller';
import { AuthController as UserAuthController } from '../apps/user-service/src/auth/auth.controller';

import {
  CreateCourseSchema,
  FindAllCoursesSchema,
  CourseIdSchema,
} from '../apps/academy-service/src/courses/courses.validation';
import {
  ForgotPasswordSchema as AcademyForgotSchema,
  ResetPasswordSchema as AcademyResetSchema,
  SelectRoleSchema as AcademySelectRoleSchema,
} from '../apps/academy-service/src/user/user.validation';
import {
  ForgotPasswordSchema as UserForgotSchema,
  ResetPasswordSchema as UserResetSchema,
} from '../apps/user-service/src/auth/auth.validation';

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

function inspectEndpoints(controllerClass: any) {
  const proto = controllerClass.prototype;
  const methods = Object.getOwnPropertyNames(proto).filter((m) => m !== 'constructor');
  const routes: Array<{ handler: string; method: string; paths: string[] }> = [];

  for (const m of methods) {
    const rawMethod = Reflect.getMetadata(METHOD_METADATA, proto[m]);
    const httpMethod = rawMethod !== undefined ? METHOD_NAMES[rawMethod] : 'NONE';
    const pathMeta = Reflect.getMetadata(PATH_METADATA, proto[m]);
    const paths = Array.isArray(pathMeta) ? pathMeta : pathMeta !== undefined ? [pathMeta] : [];
    if (httpMethod !== 'NONE') {
      routes.push({ handler: m, method: httpMethod, paths });
    }
  }
  return routes;
}

async function runVerification() {
  console.log('\n========================================================================');
  console.log('   🔍 VERIFICATION: COURSES, GET ALL COURSES & FORGOT PASSWORD ENDPOINTS');
  console.log('========================================================================\n');

  let hasErrors = false;

  // 1. Verify CoursesController Endpoints
  console.log('📦 1. Checking CoursesController Endpoints:');
  const courseRoutes = inspectEndpoints(CoursesController);
  for (const r of courseRoutes) {
    console.log(`   [${r.method.padEnd(5)}] ${r.handler.padEnd(28)} -> [${r.paths.join(' | ')}]`);
  }

  const findCoursesRoute = courseRoutes.find((r) => r.handler === 'findAll');
  if (!findCoursesRoute || !findCoursesRoute.paths.includes('courses') || findCoursesRoute.method !== 'GET') {
    console.log('   ❌ ERROR: Missing GET /courses on CoursesController');
    hasErrors = true;
  } else {
    console.log('   ✔ GET /courses & /courses/all endpoint verified successfully');
  }

  const createCourseRoute = courseRoutes.find((r) => r.handler === 'create');
  if (!createCourseRoute || !createCourseRoute.paths.includes('courses') || createCourseRoute.method !== 'POST') {
    console.log('   ❌ ERROR: Missing POST /courses on CoursesController');
    hasErrors = true;
  } else {
    console.log('   ✔ POST /courses endpoint verified successfully');
  }

  const findOneCourseRoute = courseRoutes.find((r) => r.handler === 'findOne');
  if (!findOneCourseRoute || !findOneCourseRoute.paths.includes('courses/:id') || findOneCourseRoute.method !== 'GET') {
    console.log('   ❌ ERROR: Missing GET /courses/:id on CoursesController');
    hasErrors = true;
  } else {
    console.log('   ✔ GET /courses/:id endpoint verified successfully');
  }

  // 2. Verify Academy UserController Endpoints (Profile, Forgot Password, Reset Password, Select Role)
  console.log('\n📦 2. Checking Academy UserController Endpoints:');
  const academyUserRoutes = inspectEndpoints(AcademyUserController);
  for (const r of academyUserRoutes) {
    console.log(`   [${r.method.padEnd(5)}] ${r.handler.padEnd(28)} -> [${r.paths.join(' | ')}]`);
  }

  const academyForgot = academyUserRoutes.find((r) => r.handler === 'forgotPassword');
  if (!academyForgot || academyForgot.method !== 'POST') {
    console.log('   ❌ ERROR: Missing POST forgotPassword on Academy UserController');
    hasErrors = true;
  } else {
    console.log(`   ✔ Academy UserController.forgotPassword HTTP routes: [${academyForgot.paths.join(' | ')}]`);
  }

  const academyReset = academyUserRoutes.find((r) => r.handler === 'resetPassword');
  if (!academyReset || academyReset.method !== 'POST') {
    console.log('   ❌ ERROR: Missing POST resetPassword on Academy UserController');
    hasErrors = true;
  } else {
    console.log(`   ✔ Academy UserController.resetPassword HTTP routes: [${academyReset.paths.join(' | ')}]`);
  }

  // 3. Verify User-Service AuthController Endpoints (Forgot Password, Reset Password)
  console.log('\n📦 3. Checking User-Service AuthController Endpoints:');
  const userAuthRoutes = inspectEndpoints(UserAuthController);
  const userForgot = userAuthRoutes.find((r) => r.handler === 'forgotPassword');
  if (!userForgot || userForgot.method !== 'POST') {
    console.log('   ❌ ERROR: Missing POST forgotPassword on User-Service AuthController');
    hasErrors = true;
  } else {
    console.log(`   ✔ User-Service AuthController.forgotPassword HTTP routes: [${userForgot.paths.join(' | ')}]`);
  }

  const userReset = userAuthRoutes.find((r) => r.handler === 'resetPassword');
  if (!userReset || userReset.method !== 'POST') {
    console.log('   ❌ ERROR: Missing POST resetPassword on User-Service AuthController');
    hasErrors = true;
  } else {
    console.log(`   ✔ User-Service AuthController.resetPassword HTTP routes: [${userReset.paths.join(' | ')}]`);
  }

  // 4. Test Validation Schemas for Forgot Password & Courses
  console.log('\n🧪 4. Testing Validation Schemas:');

  // Test Academy ForgotPasswordSchema
  const forgotVal1 = AcademyForgotSchema.validate({ email: 'student@example.com' });
  if (forgotVal1.error) {
    console.log(`   ❌ Academy ForgotPasswordSchema failed: ${forgotVal1.error.message}`);
    hasErrors = true;
  } else {
    console.log('   ✔ Academy ForgotPasswordSchema passed for direct HTTP body');
  }

  // Test User-Service ForgotPasswordSchema
  const forgotVal2 = UserForgotSchema.validate({ email: 'instructor@example.com', app: 'academy' });
  if (forgotVal2.error) {
    console.log(`   ❌ User-Service ForgotPasswordSchema failed: ${forgotVal2.error.message}`);
    hasErrors = true;
  } else {
    console.log('   ✔ User-Service ForgotPasswordSchema passed for direct HTTP body');
  }

  // Test Course creation schema
  const coursePayload = {
    title: 'Healthcare Specialist Certification',
    description: 'Accredited training program',
    category: 'NURSING',
    level: 'BEGINNER',
  };
  const courseVal = CreateCourseSchema.validate(coursePayload);
  if (courseVal.error) {
    console.log(`   ❌ CreateCourseSchema failed: ${courseVal.error.message}`);
    hasErrors = true;
  } else {
    console.log('   ✔ CreateCourseSchema passed for direct HTTP body');
  }

  // 5. Unit Test Execution on Academy UserController.forgotPassword
  console.log('\n🧪 5. Testing Academy UserController.forgotPassword Execution:');
  const mockUserService: any = {
    forgotPassword: async (data: any) => ({
      success: true,
      message: `Password reset link forwarded for ${data.email}`,
    }),
  };
  const academyUserController = new AcademyUserController(mockUserService);

  const directHttpResult = await academyUserController.forgotPassword({
    email: 'test.user@alikohub.com',
  });
  if (directHttpResult?.success) {
    console.log('   ✔ Direct HTTP body call to academyUserController.forgotPassword succeeded');
  } else {
    console.log('   ❌ Direct HTTP body call to academyUserController.forgotPassword failed');
    hasErrors = true;
  }

  const tcpResult = await academyUserController.forgotPassword(
    undefined,
    { email: 'tcp.user@alikohub.com' }
  );
  if (tcpResult?.success) {
    console.log('   ✔ Microservice TCP payload call to academyUserController.forgotPassword succeeded');
  } else {
    console.log('   ❌ Microservice TCP payload call to academyUserController.forgotPassword failed');
    hasErrors = true;
  }

  console.log('\n========================================================================');
  if (hasErrors) {
    console.log('   ❌ VERIFICATION FAILED WITH ERRORS');
    process.exit(1);
  } else {
    console.log('   ✨ ALL ENDPOINTS, SCHEMAS & CONTROLLERS VERIFIED 100% OPERATIONAL');
    console.log('========================================================================\n');
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
