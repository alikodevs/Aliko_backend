# Academy Backend Guards Documentation

This document provides a comprehensive overview of all guards implemented across the AlikoHub Academy backend for role-based access control and security.

## 🔒 **Guard Overview**

### **Authentication Guards**
- **FirebaseAuthGuard**: Handles Firebase token authentication
- **RoleGuard**: Manages role-based access control

### **Access Control Guards**
- **ContentAccessGuard**: Controls content access based on enrollment
- **CourseAccessGuard**: Controls course access based on role and enrollment
- **CohortAccessGuard**: Controls cohort access based on enrollment
- **LessonAccessGuard**: Controls lesson access based on course enrollment
- **ModuleAccessGuard**: Controls module access based on course enrollment

### **Management Guards**
- **InstructorContentGuard**: Restricts content management to instructors/admins
- **InstructorCourseGuard**: Restricts course management to instructors/admins
- **InstructorCohortGuard**: Restricts cohort management to instructors/admins
- **InstructorLessonGuard**: Restricts lesson management to instructors/admins
- **InstructorModuleGuard**: Restricts module management to instructors/admins
- **EnrollmentGuard**: Controls enrollment operations

## 📋 **Module Guard Status**

### ✅ **Fully Protected Modules**

#### 1. **Content Module** - ✅ **COMPLETE**
- **Guards**: `ContentAccessGuard`, `InstructorContentGuard`
- **Authentication**: `FirebaseAuthGuard`
- **Role Control**: `RoleGuard`
- **Endpoints**: All content operations protected

#### 2. **User Module** - ✅ **COMPLETE**
- **Guards**: `FirebaseAuthGuard`, `RoleGuard`
- **Endpoints**: Profile operations and admin-only user management

#### 3. **Enrollments Module** - ✅ **COMPLETE**
- **Guards**: `EnrollmentGuard`
- **Endpoints**: All enrollment operations protected

#### 4. **Courses Module** - ✅ **COMPLETE**
- **Guards**: `CourseAccessGuard`, `InstructorCourseGuard`
- **Authentication**: `FirebaseAuthGuard`
- **Role Control**: `RoleGuard`
- **Endpoints**: All course operations protected

#### 5. **Cohorts Module** - ✅ **COMPLETE**
- **Guards**: `CohortAccessGuard`, `InstructorCohortGuard`
- **Authentication**: `FirebaseAuthGuard`
- **Endpoints**: All cohort operations protected

#### 6. **Lessons Module** - ✅ **COMPLETE**
- **Guards**: `LessonAccessGuard`, `InstructorLessonGuard`
- **Authentication**: `FirebaseAuthGuard`
- **Endpoints**: All lesson operations protected

#### 7. **Course Modules Module** - ✅ **COMPLETE**
- **Guards**: `ModuleAccessGuard`, `InstructorModuleGuard`
- **Authentication**: `FirebaseAuthGuard`
- **Endpoints**: All module operations protected

### ✅ **Public Modules (No Guards Needed)**

#### 8. **Auth Module** - ✅ **CORRECTLY PUBLIC**
- **Reason**: Registration and login endpoints must be public
- **Endpoints**: `/auth/register`, `/auth/login`, `/auth/login/google`

## 🔐 **Guard Implementation Details**

### **Access Control Logic**

#### **Student Access**
- Can view published courses
- Can access content for enrolled courses
- Can view cohorts they're enrolled in
- Can access lessons and modules for enrolled courses
- Cannot perform management operations

#### **Instructor Access**
- Can manage their own courses
- Can access all content for their courses
- Can manage cohorts for their courses
- Can manage lessons and modules for their courses
- Cannot access other instructors' content

#### **Admin Access**
- Full access to all resources
- Can assign instructors to courses
- Can manage all content across the platform
- Can view all user data

### **Guard Hierarchy**

```
FirebaseAuthGuard (Authentication)
    ↓
RoleGuard (Role-based access)
    ↓
Specific Access Guards (Resource-specific access)
    ↓
Management Guards (CRUD operations)
```

## 🛡️ **Security Features**

### **Authentication**
- Firebase token validation
- User session management
- Token expiration handling

### **Authorization**
- Role-based access control (STUDENT, INSTRUCTOR, ADMIN)
- Resource ownership validation
- Enrollment-based access control
- Course-level permissions

### **Data Protection**
- User data isolation
- Course content protection
- Enrollment verification
- Ownership validation

## 📊 **API Endpoint Protection Summary**

### **Public Endpoints**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/login/google` - Google OAuth login

### **Protected Endpoints by Role**

#### **Student Endpoints**
- `GET /courses` - View published courses
- `GET /courses/:id` - View enrolled course details
- `GET /cohorts` - View enrolled cohorts
- `GET /lessons/module/:moduleId` - View lessons for enrolled courses
- `GET /modules/course/:courseId` - View modules for enrolled courses
- `GET /content/lesson/:lessonId` - Access lesson content
- `POST /enrollments` - Self-enrollment

#### **Instructor Endpoints**
- All student endpoints
- `POST /courses` - Create courses
- `PATCH /courses/:id` - Update own courses
- `DELETE /courses/:id` - Delete own courses
- `POST /cohorts` - Create cohorts for own courses
- `POST /lessons` - Create lessons for own courses
- `POST /modules` - Create modules for own courses
- `POST /content` - Create content for own courses

#### **Admin Endpoints**
- All instructor endpoints
- `GET /user/all` - View all users
- `PATCH /courses/:id/instructor` - Assign instructors
- Full CRUD operations on all resources

## 🔧 **Guard Configuration**

### **Environment Variables**
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### **Module Registration**
Each module includes its guards in the providers array:
```typescript
@Module({
  imports: [PrismaModule],
  controllers: [ModuleController],
  providers: [ModuleService, AccessGuard, ManagementGuard],
  exports: [ModuleService],
})
```

## 🧪 **Testing Guards**

### **Unit Tests**
Each guard has corresponding unit tests:
- Authentication validation
- Role-based access control
- Resource ownership validation
- Error handling

### **Integration Tests**
- End-to-end API testing with different user roles
- Guard interaction testing
- Error response validation

## 🚀 **Future Enhancements**

### **Planned Improvements**
- [ ] Rate limiting guards
- [ ] Audit logging guards
- [ ] Multi-tenant access guards
- [ ] Advanced permission system
- [ ] Session management guards
- [ ] API key authentication guards

### **Security Enhancements**
- [ ] JWT token refresh mechanism
- [ ] Two-factor authentication
- [ ] IP-based access control
- [ ] Device fingerprinting
- [ ] Suspicious activity detection

## 📝 **Usage Examples**

### **Adding Guards to New Endpoints**
```typescript
@Controller('example')
@UseGuards(FirebaseAuthGuard)
export class ExampleController {
  
  @UseGuards(AccessGuard)
  @Get(':id')
  getResource(@Param('id') id: string) {
    // Access control handled by guard
  }

  @UseGuards(ManagementGuard)
  @Post()
  createResource(@Body() dto: CreateDto) {
    // Management control handled by guard
  }
}
```

### **Custom Guard Logic**
```typescript
@Injectable()
export class CustomGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Custom access logic
    return true;
  }
}
```

## 🔍 **Troubleshooting**

### **Common Issues**
1. **Guard not working**: Check module registration
2. **Authentication failing**: Verify Firebase configuration
3. **Access denied**: Check user role and resource ownership
4. **Guard conflicts**: Ensure proper guard order

### **Debug Mode**
Enable debug logging for guards:
```typescript
// In guard implementation
console.log('Guard check:', { user, resource, result });
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: AlikoHub Development Team
