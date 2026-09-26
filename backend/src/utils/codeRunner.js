const vm = require('vm');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const getPythonCmd = () => {
  try {
    execSync('python --version', { stdio: 'pipe' });
    return 'python';
  } catch (e) {
    try {
      execSync('python3 --version', { stdio: 'pipe' });
      return 'python3';
    } catch (e2) {
      return null;
    }
  }
};

const runJavaScript = (code, testCases) => {
  let passedCount = 0;
  let consoleOutput = '';
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const logs = [];
    const sandbox = {
      console: {
        log: (...args) => {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        },
      },
    };

    try {
      const context = vm.createContext(sandbox);
      let runCode = code;
      if (code.includes('function solution')) {
        runCode += `\n\nsolution(${tc.input});`;
      } else {
        sandbox.input = tc.input;
      }

      const script = new vm.Script(runCode);
      const result = script.runInContext(context, { timeout: 1500 });

      const actualOutput = logs.length > 0 
        ? logs[logs.length - 1].trim() 
        : (result !== undefined ? String(result).trim() : '');

      const expected = tc.expectedOutput.trim();
      const isPassed = actualOutput === expected;

      if (isPassed) passedCount++;

      results.push({
        testCaseIndex: i,
        input: tc.input,
        expectedOutput: expected,
        actualOutput: actualOutput,
        passed: isPassed,
        logs: logs.join('\n'),
      });

      consoleOutput += `Test Case ${i + 1}: Input [${tc.input}] => Expected [${expected}], Got [${actualOutput}] - ${isPassed ? 'PASSED' : 'FAILED'}\n`;
      if (logs.length > 0) {
        consoleOutput += `Logs:\n${logs.join('\n')}\n`;
      }
    } catch (err) {
      results.push({
        testCaseIndex: i,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: err.message,
        passed: false,
        error: true,
      });
      consoleOutput += `Test Case ${i + 1}: Error: ${err.message}\n`;
      break;
    }
  }

  return {
    passedCount,
    totalCount: testCases.length,
    results,
    consoleOutput,
    status: passedCount === testCases.length ? 'pass' : 'fail',
  };
};

const runPython = (code, testCases) => {
  const pyCmd = getPythonCmd();
  if (!pyCmd) {
    return {
      passedCount: 0,
      totalCount: testCases.length,
      results: [],
      consoleOutput: 'Python is not available on this server environment.',
      status: 'compile_error',
    };
  }

  let passedCount = 0;
  let consoleOutput = '';
  const results = [];
  const tempDir = path.join(__dirname, '../../temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFile = path.join(tempDir, `solution_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);
  fs.writeFileSync(tempFile, code);

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const stdout = execSync(`"${pyCmd}" "${tempFile}"`, {
        input: String(tc.input || ''),
        encoding: 'utf-8',
        timeout: 2500,
      });

      const actualOutput = stdout.trim();
      const expected = tc.expectedOutput.trim();
      const isPassed = actualOutput === expected;

      if (isPassed) passedCount++;

      results.push({
        testCaseIndex: i,
        input: tc.input,
        expectedOutput: expected,
        actualOutput: actualOutput,
        passed: isPassed,
      });

      consoleOutput += `Test Case ${i + 1}: Input [${tc.input}] => Expected [${expected}], Got [${actualOutput}] - ${isPassed ? 'PASSED' : 'FAILED'}\n`;
    } catch (err) {
      const errOut = (err.stderr || err.stdout || err.message || '').toString();
      results.push({
        testCaseIndex: i,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: errOut,
        passed: false,
        error: true,
      });
      consoleOutput += `Test Case ${i + 1}: Error:\n${errOut}\n`;
      break;
    }
  }

  try {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  } catch (e) {}

  return {
    passedCount,
    totalCount: testCases.length,
    results,
    consoleOutput,
    status: passedCount === testCases.length ? 'pass' : 'fail',
  };
};

const runJava = (code, testCases) => {
  let passedCount = 0;
  let consoleOutput = '';
  const results = [];
  const tempDir = path.join(__dirname, '../../temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Ensure class name matches file name
  const className = 'Solution_' + Date.now();
  let adjustedCode = code;
  if (/public\s+class\s+\w+/.test(adjustedCode)) {
    adjustedCode = adjustedCode.replace(/public\s+class\s+\w+/, `public class ${className}`);
  } else if (/class\s+\w+/.test(adjustedCode)) {
    adjustedCode = adjustedCode.replace(/class\s+\w+/, `public class ${className}`);
  }

  const tempFile = path.join(tempDir, `${className}.java`);
  fs.writeFileSync(tempFile, adjustedCode);

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const stdout = execSync(`java "${tempFile}"`, {
        input: String(tc.input || ''),
        encoding: 'utf-8',
        timeout: 4000,
      });

      const actualOutput = stdout.trim();
      const expected = tc.expectedOutput.trim();
      const isPassed = actualOutput === expected;

      if (isPassed) passedCount++;

      results.push({
        testCaseIndex: i,
        input: tc.input,
        expectedOutput: expected,
        actualOutput: actualOutput,
        passed: isPassed,
      });

      consoleOutput += `Test Case ${i + 1}: Input [${tc.input}] => Expected [${expected}], Got [${actualOutput}] - ${isPassed ? 'PASSED' : 'FAILED'}\n`;
    } catch (err) {
      const errOut = (err.stderr || err.stdout || err.message || '').toString();
      results.push({
        testCaseIndex: i,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: errOut,
        passed: false,
        error: true,
      });
      consoleOutput += `Test Case ${i + 1}: Error:\n${errOut}\n`;
      break;
    }
  }

  try {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  } catch (e) {}

  return {
    passedCount,
    totalCount: testCases.length,
    results,
    consoleOutput,
    status: passedCount === testCases.length ? 'pass' : 'fail',
  };
};

const runCode = (code, testCases, language = 'javascript') => {
  const normLang = (language || 'javascript').toLowerCase();

  if (normLang === 'python' || normLang === 'py') {
    return runPython(code, testCases);
  }

  if (normLang === 'java') {
    return runJava(code, testCases);
  }

  if (normLang === 'typescript' || normLang === 'ts') {
    // Strip simple typescript types or run as JS
    const stripped = code.replace(/:\s*[A-Za-z0-9_<>\[\]|&]+/g, '');
    return runJavaScript(stripped, testCases);
  }

  if (normLang === 'cpp' || normLang === 'c++' || normLang === 'c') {
    // Check if gcc/g++ is available
    try {
      execSync('g++ --version', { stdio: 'pipe' });
      // Compile & run
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const srcFile = path.join(tempDir, `sol_${Date.now()}.cpp`);
      const exeFile = path.join(tempDir, `sol_${Date.now()}.exe`);
      fs.writeFileSync(srcFile, code);
      execSync(`g++ "${srcFile}" -o "${exeFile}"`, { timeout: 3000 });

      let passedCount = 0;
      let consoleOutput = '';
      const results = [];
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const out = execSync(`"${exeFile}"`, { input: String(tc.input || ''), encoding: 'utf-8', timeout: 2000 }).trim();
        const isPassed = out === tc.expectedOutput.trim();
        if (isPassed) passedCount++;
        results.push({ testCaseIndex: i, input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: out, passed: isPassed });
        consoleOutput += `Test Case ${i + 1}: Input [${tc.input}] => Expected [${tc.expectedOutput}], Got [${out}] - ${isPassed ? 'PASSED' : 'FAILED'}\n`;
      }
      try { fs.unlinkSync(srcFile); fs.unlinkSync(exeFile); } catch (_) {}
      return { passedCount, totalCount: testCases.length, results, consoleOutput, status: passedCount === testCases.length ? 'pass' : 'fail' };
    } catch (e) {
      return {
        passedCount: 0,
        totalCount: testCases.length,
        results: [],
        consoleOutput: 'Native C/C++ compiler is not available on this server host. Supported languages for execution: JavaScript, Python, Java, TypeScript.',
        status: 'compile_error',
      };
    }
  }

  // Default to JavaScript
  return runJavaScript(code, testCases);
};

module.exports = { runCode };
