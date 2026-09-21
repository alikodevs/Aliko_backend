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
  console.log('--- Con-Tech Project Creations Test ---');
  let token = '';

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
    console.log('✅ Authentication successful.');

    let projectId = null;

    console.log('\n2. Testing POST /projects...');
    const createProjectPayload = {
      name: 'Alpha Construction Site',
      description: 'Test project for validation',
      startDate: new Date().toISOString(),
      budget: 5000000,
      location: 'Downtown District'
    };
    const createRes = await request('POST', '/projects', createProjectPayload, token);
    console.log(`Status: ${createRes.status}`);
    console.log('Response:', createRes.body);

    if (createRes.status === 201 || createRes.status === 200) {
      console.log('✅ Project creation successful.');
      projectId = createRes.body.id || createRes.body.data?.id;
    } else {
      console.error('❌ Project creation failed.');
    }

    if (projectId) {
      console.log(`\n3. Testing POST /projects/${projectId}/progress...`);
      const progressPayload = {
        progress: 15,
        notes: 'Initial groundwork started.',
      };
      const progressRes = await request('POST', `/projects/${projectId}/progress`, progressPayload, token);
      console.log(`Status: ${progressRes.status}`);
      console.log('Response:', progressRes.body);

      console.log(`\n4. Testing POST /projects/${projectId}/updates...`);
      const updatePayload = {
        text: 'Week 1 update: Excavation complete.',
        isVisibleToClient: true,
      };
      const updateRes = await request('POST', `/projects/${projectId}/updates`, updatePayload, token);
      console.log(`Status: ${updateRes.status}`);
      console.log('Response:', updateRes.body);

      console.log(`\n5. Testing POST /projects/${projectId}/comments...`);
      const commentPayload = {
        content: 'This is a test comment from the manager.',
      };
      const commentRes = await request('POST', `/projects/${projectId}/comments`, commentPayload, token);
      console.log(`Status: ${commentRes.status}`);
      console.log('Response:', commentRes.body);
    }

  } catch (error) {
    console.error('Test execution error:', error);
  }
}

main();
