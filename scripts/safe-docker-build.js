import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';

const LOG_FILE = 'build-capacity.log';
const MEMORY_THRESHOLD_PERCENT = 90; // Warn if memory usage exceeds 90%

function log(message) {
  const time = new Date().toISOString();
  const line = `[${time}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

log('--- Starting Resource-Monitored Docker Build ---');
log('Enforcing COMPOSE_PARALLEL_LIMIT=1 to prevent concurrent builds from exhausting server RAM & CPU.');

// Determine which command to run (can pass e.g., "-f docker-compose.vps.yml build")
const args = process.argv.slice(2);
let dockerArgs = ['build'];
if (args.length > 0) {
  dockerArgs = [...args];
}

const env = { 
  ...process.env, 
  // Forces docker-compose to build sequentially rather than in parallel
  COMPOSE_PARALLEL_LIMIT: '1' 
};

// Spawn the build process
const buildProcess = spawn('docker-compose', dockerArgs, {
  stdio: 'inherit',
  env: env
});

// Start monitoring capacity
const monitorInterval = setInterval(() => {
  const total = os.totalmem();
  const free = os.freemem();
  const usedPercent = ((total - free) / total) * 100;

  if (usedPercent > MEMORY_THRESHOLD_PERCENT) {
    log(`WARNING: High Memory Usage! ${usedPercent.toFixed(1)}% used (${(free / 1024 / 1024).toFixed(0)} MB free). Server capacity is near its limit.`);
  }

  // Check load average conceptually
  const cpuLoad = os.loadavg()[0]; 
  const cpus = os.cpus().length;
  // If load avg > cores * 2, it indicates a highly congested CPU
  if (cpuLoad > cpus * 2) {
      log(`WARNING: High CPU Load! Load Average (1m): ${cpuLoad.toFixed(2)} on ${cpus} cores.`);
  }

}, 5000); // Check every 5 seconds

buildProcess.on('close', (code) => {
  clearInterval(monitorInterval);
  if (code === 0) {
    log('✅ Build completed successfully without completely exhausting capacity.');
  } else {
    log(`❌ Build failed or was aborted with exit code ${code}. If the VPS got slow, it might have been an OOM (Out-Of-Memory) kill.`);
  }
});
