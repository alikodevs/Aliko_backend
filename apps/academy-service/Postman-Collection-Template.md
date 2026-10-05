# AlikoHub Academy Backend - Postman Collection Template

## Collection Structure

Create a new Postman collection with the following folders and requests:

### 1. Authentication Folder

#### Login Request
- **Method**: POST
- **URL**: `{{baseUrl}}/auth/login`
- **Headers**: Content-Type: application/json
- **Body**:
```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```
- **Tests**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("authToken", response.token);
    pm.environment.set("userId", response.user.id);
    pm.test("Login successful", function () {
        pm.expect(pm.response.code).to.equal(200);
        pm.expect(response.token).to.be.a("string");
    });
} else {
    pm.test("Login failed", function () {
        pm.expect(pm.response.code).to.be.oneOf([400, 401, 404]);
    });
}
```

#### Register Request
- **Method**: POST
- **URL**: `{{baseUrl}}/auth/register`
- **Headers**: Content-Type: application/json
- **Body**:
```json
{
  "email": "{{newUserEmail}}",
  "password": "{{newUserPassword}}",
  "displayName": "New Test User"
}
```

### 2. User Management Folder

#### Get Profile
- **Method**: GET
- **URL**: `{{baseUrl}}/user/profile`
- **Headers**: Authorization: Bearer {{authToken}}

#### Update Profile
- **Method**: PUT
- **URL**: `{{baseUrl}}/user/profile`
- **Headers**: Authorization: Bearer {{authToken}}, Content-Type: application/json
- **Body**:
```json
{
  "displayName": "Updated Name",
  "bio": "Updated bio information"
}
```

### 3. Academy Profile Folder

#### Get Academy Profile
- **Method**: GET
- **URL**: `{{baseUrl}}/academy/profile`
- **Headers**: Authorization: Bearer {{authToken}}

#### Create Academy Profile
- **Method**: POST
- **URL**: `{{baseUrl}}/academy/profile`
- **Headers**: Authorization: Bearer {{authToken}}, Content-Type: application/json
- **Body**:
```json
{
  "bio": "Passionate learner and educator",
  "interests": ["Technology", "Education", "Innovation"],
  "experience": "5 years in software development"
}
```

#### Select Role
- **Method**: POST
- **URL**: `{{baseUrl}}/academy/select-role`
- **Headers**: Authorization: Bearer {{authToken}}, Content-Type: application/json
- **Body**:
```json
{
  "role": "STUDENT"
}
```

### 4. Courses Folder

#### Create Course
- **Method**: POST
- **URL**: `{{baseUrl}}/courses`
- **Headers**: Authorization: Bearer {{authToken}}, Content-Type: application/json
- **Body**:
```json
{
  "title": "Introduction to Web Development",
  "description": "Learn the fundamentals of web development",
  "duration": 40,
  "difficulty": "BEGINNER",
  "category": "Programming"
}
```
- **Tests**:
```javascript
pm.test("Course created successfully", function () {
    pm.expect(pm.response.code).to.equal(201);
    const response = pm.response.json();
    pm.expect(response.id).to.be.a("string");
    pm.environment.set("courseId", response.id);
});
```

#### Get All Courses
- **Method**: GET
- **URL**: `{{baseUrl}}/courses`
- **Headers**: Authorization: Bearer {{authToken}}

#### Get Course by ID
- **Method**: GET
- **URL**: `{{baseUrl}}/courses/{{courseId}}`
- **Headers**: Authorization: Bearer {{authToken}}

#### Update Course
- **Method**: PUT
- **URL**: `{{baseUrl}}/courses/{{courseId}}`
- **Headers**: Authorization: Bearer {{authToken}}, Content-Type: application/json
- **Body**:
```json
{
  "title": "Updated Course Title",
  "description": "Updated course description"
}
```

#### Delete Course
- **Method**: DELETE
- **URL**: `{{baseUrl}}/courses/{{courseId}}`
- **Headers**: Authorization: Bearer {{authToken}}

## Environment Variables

Create environment with these variables:
- `baseUrl`: http://localhost:3001
- `email`: test@example.com
- `password`: password123
- `newUserEmail`: newuser@example.com
- `newUserPassword`: newpassword123
- `authToken`: (auto-set)
- `userId`: (auto-set)
- `courseId`: (auto-set)

## Global Tests

Add to collection-level tests:
```javascript
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});
```
