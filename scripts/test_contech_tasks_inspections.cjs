const http = require('http');

const API_URL = 'http://localhost:3006';
const EMAIL = 'admin@alikohub.com';
const PASSWORD = 'Test@1234';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('--- Con-Tech Tasks & Client Reports Test ---');
  let token = '';
  let adminId = '';

  try {
    console.log(`\n1. Authenticating as ${EMAIL}...`);
    const loginRes = await request('POST', '/auth/login', {
      email: EMAIL,
      password: PASSWORD
    });

    if (loginRes.status !== 200 && loginRes.status !== 201) {
      console.error('Login failed:', loginRes.status, loginRes.body);
      return;
    }
    token = loginRes.body.accessToken || loginRes.body.data?.accessToken || loginRes.body.token;
    if (!token) {
      console.error('Could not find JWT token in login response:', loginRes.body);
      return;
    }
    
    // Decode JWT to get adminId
    try {
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      adminId = decoded.uid || decoded.sub || decoded.user_id || decoded.id;
      console.log(`✅ Authentication successful. Admin ID: ${adminId}`);
    } catch(err) {
      console.error('Failed to decode JWT:', err);
      adminId = 'admin_user_id';
    }

    console.log('\n2. Creating Base Project...');
    const createProjectPayload = {
      name: 'Beta Tasks Test Site',
      description: 'Project to test tasks and reports',
      startDate: new Date().toISOString(),
      budget: 1000000,
      location: 'Uptown District'
    };
    const createRes = await request('POST', '/projects', createProjectPayload, token);
    
    let projectId = null;
    if (createRes.status === 201 || createRes.status === 200) {
      console.log('✅ Base Project created successfully.');
      projectId = createRes.body.id || createRes.body.data?.id || createRes.body.result?.id;
    } else {
      console.error('❌ Base Project creation failed.', createRes.body);
      return;
    }

    if (projectId && adminId) {
      console.log(`\n3. Testing POST /tasks for Project ${projectId}...`);
      const createTaskPayload = {
        projectId: projectId,
        description: 'Pour building foundation',
        assignedTo: adminId,
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(), 
        estimatedHours: 40,
        priority: 'HIGH'
      };
      
      const taskRes = await request('POST', `/tasks`, createTaskPayload, token);
      console.log(`Status: ${taskRes.status}`);
      console.log('Response:', taskRes.body);
      
      let taskId = null;
      if (taskRes.status === 201 || taskRes.status === 200) {
        console.log('✅ Task creation successful.');
        taskId = taskRes.body.id || taskRes.body.data?.id || taskRes.body.result?.id;
      } else {
        console.error('❌ Task creation failed.');
      }

      if (taskId) {
        console.log(`\n4. Testing PATCH /tasks/${taskId}/progress...`);
        const taskProgressPayload = { progress: 50 };
        const progressRes = await request('PATCH', `/tasks/${taskId}/progress`, taskProgressPayload, token);
        console.log(`Status: ${progressRes.status}`);
        console.log('Response:', progressRes.body);
        if (progressRes.status === 200 || progressRes.status === 201) {
            console.log('✅ Task progress update successful.');
        } else {
            console.error('❌ Task progress update failed.');
        }
      }

      console.log(`\n5. Testing POST /client-reports for Project ${projectId}...`);
      const reportPayload = {
        projectId: projectId,
        summary: 'Weekly progress is looking good. Foundation is 50% complete.',
        KPIs: {
            schedule: 'On Track',
            budget: 'Under Budget',
            safetyIncidents: 0
        }
      };
      const reportRes = await request('POST', `/client-reports`, reportPayload, token);
      console.log(`Status: ${reportRes.status}`);
      console.log('Response:', reportRes.body);
      
      if (reportRes.status === 201 || reportRes.status === 200) {
        console.log('✅ Client Report creation successful.');
      } else {
        console.error('❌ Client Report creation failed.');
      }
    }

  } catch (error) {
    console.error('Test execution error:', error);
  }
}

main();
