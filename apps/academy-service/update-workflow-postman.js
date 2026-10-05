const fs = require('fs');
const path = require('path');

const file = 'AlikoHub-Academy-Backend.postman_collection.json';
const absolutePath = path.resolve(file);

try {
  const content = fs.readFileSync(absolutePath, 'utf8');
  const data = JSON.parse(content);

  const teacherWorkflowFolder = {
    name: 'Teacher Workflow',
    item: [
      {
        name: 'Step 1: Create Course (Draft)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{authToken}}' },
            { key: 'Content-Type', value: 'application/json' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              title: 'Mastering Agentic AI',
              shortDescription: 'From zero to agentic hero',
              longDescription: 'Comprehensive guide to building powerful AI agents.',
              category: 'Technology',
              outcomes: ['Build AI Agents', 'Deploy Microservices'],
              estimatedTime: 120,
              targetLevel: 'INTERMEDIATE',
              price: 499,
              status: 'DRAFT'
            }, null, 2)
          },
          url: { raw: '{{baseUrl}}/academy/courses', host: ['{{baseUrl}}'], path: ['academy', 'courses'] }
        },
        event: [{
          listen: 'test',
          script: {
            exec: [
              'if (pm.response.code === 201) {',
              '    const response = pm.response.json();',
              '    pm.environment.set("courseId", response.id);',
              '}'
            ],
            type: 'text/javascript'
          }
        }]
      },
      {
        name: 'Step 2: Create Module',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{authToken}}' },
            { key: 'Content-Type', value: 'application/json' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              title: 'Module 1: Foundations',
              description: 'Setting up the environment',
              courseId: '{{courseId}}'
            }, null, 2)
          },
          url: { raw: '{{baseUrl}}/academy/modules', host: ['{{baseUrl}}'], path: ['academy', 'modules'] }
        },
        event: [{
          listen: 'test',
          script: {
            exec: [
              'if (pm.response.code === 201) {',
              '    const response = pm.response.json();',
              '    pm.environment.set("moduleId", response.id);',
              '}'
            ],
            type: 'text/javascript'
          }
        }]
      },
      {
        name: 'Step 3: Create Lesson (with Video & Text)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{authToken}}' },
            { key: 'Content-Type', value: 'application/json' }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              title: 'Lesson 1.1: Environment Setup',
              type: 'VIDEO',
              moduleId: '{{moduleId}}',
              order: 1,
              contents: [
                { title: 'Intro Video', type: 'VIDEO', url: 'https://video.com/123' },
                { title: 'Setup Guide', type: 'TEXT', body: 'Step 1: Install Node.js...' }
              ]
            }, null, 2)
          },
          url: { raw: '{{baseUrl}}/academy/lessons', host: ['{{baseUrl}}'], path: ['academy', 'lessons'] }
        }
      },
      {
        name: 'Step 4: Submit for Approval',
        request: {
          method: 'POST',
          header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
          url: { raw: '{{baseUrl}}/academy/courses/{{courseId}}/submit', host: ['{{baseUrl}}'], path: ['academy', 'courses', '{{courseId}}', 'submit'] }
        }
      },
      {
        name: 'Step 5: Admin Approve',
        request: {
          method: 'POST',
          header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
          url: { raw: '{{baseUrl}}/academy/courses/{{courseId}}/approve', host: ['{{baseUrl}}'], path: ['academy', 'courses', '{{courseId}}', 'approve'] }
        }
      }
    ]
  };

  data.item.push(teacherWorkflowFolder);

  fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Postman collection updated with Teacher Workflow.');
} catch (error) {
  console.error('Error updating collection:', error);
}
