const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const mlBackendDir = path.join(rootDir, 'behavioral-auth-ml-service', 'backend');

const pythonExecutable = 'python';

console.log(`[ML Service] Starting with Python: ${pythonExecutable}`);

const child = spawn(pythonExecutable, ['-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], {
  cwd: mlBackendDir,
  stdio: 'inherit',
  shell: false
});

child.on('error', (err) => {
  console.error('[ML Service] Failed to start process:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
