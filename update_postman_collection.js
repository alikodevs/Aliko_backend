const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'postman', 'AlikoHub_Master_API_Collection.json');

function makeReq(name, method, urlPath, body = null, isAuth = true, isMultipart = false) {
  const pathParts = urlPath.split('/').filter(Boolean);
  const rawUrl = `{{baseUrl}}/${urlPath}`;

  const headers = [];
  if (isAuth) {
    headers.push({ key: 'Authorization', value: 'Bearer {{accessToken}}', type: 'text' });
  }

  const req = {
    name,
    request: {
      method,
      header: headers,
      url: {
        raw: rawUrl,
        host: ['{{baseUrl}}'],
        path: pathParts,
      },
    },
    response: [],
  };

  if (isMultipart) {
    req.request.body = {
      mode: 'formdata',
      formdata: [
        { key: 'file', type: 'file', src: [] },
      ],
    };
  } else if (body) {
    headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
    req.request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  return req;
}

const collection = {
  info: {
    _postman_id: "aliko-master-collection-uuid-v1",
    name: "AlikoHub Platform — Unified API Collection",
    description: "Unified master API collection for AlikoHub microservices gateway. Includes Authentication, Academy, ConTech, Events, Careers, Financial transactions, Communication, and Storage.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "01. Observability & Health",
      item: [
        makeReq("API Gateway Health", "GET", "health", null, false),
        makeReq("Prometheus Metrics", "GET", "metrics", null, false),
      ],
    },
    {
      name: "02. Authentication & User Service",
      item: [
        makeReq("Register User", "POST", "api/v1/auth/register", {
          email: "user@example.com",
          password: "Password@123",
          firstname: "John",
          lastname: "Doe"
        }, false),
        makeReq("Login User", "POST", "api/v1/auth/login", {
          email: "user@example.com",
          password: "Password@123"
        }, false),
        makeReq("Get User Profile", "GET", "api/v1/users/me", null, true),
        makeReq("Update User Profile", "PATCH", "api/v1/users/me", {
          firstname: "Johnny"
        }, true),
      ],
    },
    {
      name: "03. Academy Service",
      item: [
        makeReq("List Courses", "GET", "api/v1/academy/courses", null, false),
        makeReq("Create Course", "POST", "api/v1/academy/courses", {
          title: "Introduction to Construction Tech",
          description: "Comprehensive foundational course."
        }, true),
        makeReq("List Cohorts", "GET", "api/v1/academy/cohorts", null, false),
        makeReq("Enroll in Course", "POST", "api/v1/academy/enrollments", {
          courseId: 1
        }, true),
      ],
    },
    {
      name: "04. ConTech Service",
      item: [
        makeReq("List Projects", "GET", "api/v1/contech/projects", null, false),
        makeReq("Create Project", "POST", "api/v1/contech/projects", {
          title: "Skyline Tower Phase 1",
          budget: 5000000
        }, true),
      ],
    },
    {
      name: "05. Events Service",
      item: [
        makeReq("List Events", "GET", "api/v1/events", null, false),
        makeReq("Create Event", "POST", "api/v1/events", {
          title: "Annual Tech & Build Expo 2026",
          date: "2026-11-15T09:00:00.000Z"
        }, true),
      ],
    },
    {
      name: "06. Careers Service",
      item: [
        makeReq("List Job Postings", "GET", "api/v1/careers/jobs", null, false),
        makeReq("Apply for Job", "POST", "api/v1/careers/applications", {
          jobId: 1,
          coverLetter: "Excited to apply!"
        }, true),
      ],
    },
    {
      name: "07. Financial Service",
      item: [
        makeReq("Create Payment Session", "POST", "api/v1/financial/checkout", {
          amount: 250,
          currency: "ETB",
          purpose: "COURSE_ENROLLMENT"
        }, true),
        makeReq("Transaction History", "GET", "api/v1/financial/transactions", null, true),
      ],
    },
    {
      name: "08. Communication Service",
      item: [
        makeReq("Get User Notifications", "GET", "api/v1/communication/notifications", null, true),
        makeReq("Dispatch Notification", "POST", "api/v1/communication/notifications/dispatch", {
          recipientId: "123",
          title: "Welcome",
          body: "Welcome to AlikoHub!"
        }, true),
      ],
    },
    {
      name: "09. Storage Service",
      item: [
        makeReq("Upload File", "POST", "api/v1/storage/upload", null, true, true),
        makeReq("Get File Info", "GET", "api/v1/storage/files/sample.pdf", null, true),
      ],
    },
  ],
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "accessToken", value: "" },
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
console.log(`✔ Master Postman Collection successfully written to: ${outputPath}`);
