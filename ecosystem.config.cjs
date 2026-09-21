module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './dist/main.js',
      cwd: './domains/core-platform-services/api-gateway-service',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        API_GATEWAY_PORT: 3006,
        FILE_UPLOAD_SERVICE_HOST: 'localhost',
        FILE_UPLOAD_SERVICE_PORT: 3010,
        EVENTS_SERVICE_HOST: 'localhost',
        EVENTS_SERVICE_PORT: 3004,
        AUTH_SERVICE_HOST: 'localhost',
        AUTH_SERVICE_PORT: 3001,
        CONTECH_SERVICE_HOST: 'localhost',
        CONTECH_SERVICE_PORT: 3002,
        ACADEMY_SERVICE_HOST: 'localhost',
        ACADEMY_SERVICE_PORT: 3005,
        CONSULTANCY_SERVICE_HOST: 'localhost',
        CONSULTANCY_SERVICE_PORT: 3016
      }
    },
    {
      name: 'auth-service',
      script: './dist/main.js',
      cwd: './domains/core-platform-services/auth-service',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        AUTH_SERVICE_PORT: 3001
      }
    },
    {
      name: 'payment-service',
      script: './dist/main.js',
      cwd: './domains/core-platform-services/payment-service',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 4012,
        PAYMENT_SERVICE_PORT: 3012
      }
    },
    {
      name: 'academy-backend',
      script: './dist/main.js',
      cwd: './domains/academy/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        ACADEMY_SERVICE_PORT: 3005
      }
    },
    {
      name: 'careers-service',
      script: './dist/main.js',
      cwd: './domains/core-platform-services/careers-service/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 4005,
        CAREERS_SERVICE_PORT: 4005
      }
    },
    {
      name: 'con-tech-backend',
      script: './dist/main.js',
      cwd: './domains/con-tech/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        CONTECH_SERVICE_PORT: 3002
      }
    },
    {
      name: 'events-backend',
      script: './dist/main.js',
      cwd: './domains/events/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        EVENTS_SERVICE_PORT: 3004,
        FRONTEND_URL: 'https://events.alikohub.com'
      }
    },
    {
      name: 'conshifter-backend',
      script: './dist/main.js',
      cwd: './domains/conshifter/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3014,
        CONSHIFTER_SERVICE_PORT: 3014
      }
    },
    {
      name: 'file-upload-service',
      script: './dist/main.js',
      cwd: './domains/core-platform-services/file-upload-service',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        FILE_UPLOAD_SERVICE_PORT: 3010,
        UPLOAD_PATH: '/root/Home-Project/uploads',
        HOST_URL: 'http://localhost:3006'
      }
    },
    {
      name: 'consultancy-backend',
      script: './dist/main.js',
      cwd: './domains/consultancy/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 100,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3016,
        CONSULTANCY_SERVICE_PORT: 3016,
        HTTP_PORT: 4016
      }
    }
  ]
};
