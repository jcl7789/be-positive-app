/**
 * Tests para src/lib/logger.ts
 */

import { logDebug, logInfo, logWarn, logError } from '../../src/lib/logger';

// Capturar salida de console
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

interface LogEntry {
  level: string;
  message: string;
  hasContext: boolean;
}

const capturedLogs: LogEntry[] = [];

// Reemplazar console methods
console.debug = (message: string) => {
  try {
    const parsed = JSON.parse(message);
    capturedLogs.push({
      level: parsed.level,
      message: parsed.message,
      hasContext: !!parsed.context,
    });
  } catch {
    capturedLogs.push({ level: 'debug', message, hasContext: false });
  }
};

console.info = (message: string) => {
  try {
    const parsed = JSON.parse(message);
    capturedLogs.push({
      level: parsed.level,
      message: parsed.message,
      hasContext: !!parsed.context,
    });
  } catch {
    capturedLogs.push({ level: 'info', message, hasContext: false });
  }
};

console.warn = (message: string) => {
  try {
    const parsed = JSON.parse(message);
    capturedLogs.push({
      level: parsed.level,
      message: parsed.message,
      hasContext: !!parsed.context,
    });
  } catch {
    capturedLogs.push({ level: 'warn', message, hasContext: false });
  }
};

console.error = (message: string) => {
  try {
    const parsed = JSON.parse(message);
    capturedLogs.push({
      level: parsed.level,
      message: parsed.message,
      hasContext: !!parsed.context,
    });
  } catch {
    capturedLogs.push({ level: 'error', message, hasContext: false });
  }
};

// Simple test runner
interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
}

const tests: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          tests.push({ name, passed: true });
        })
        .catch((error) => {
          tests.push({ name, passed: false, error });
        });
    } else {
      tests.push({ name, passed: true });
    }
  } catch (error) {
    tests.push({ name, passed: false, error: error as Error });
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ============== TESTS ==============

console.log('🧪 Ejecutando tests para logger.ts...\n');

// Test 1: logInfo debe registrar mensaje
test('logger: logInfo debe registrar mensaje', () => {
  capturedLogs.length = 0;
  
  logInfo('Test message');
  
  assert(capturedLogs.length > 0, 'Debe haber registrado un log');
  const log = capturedLogs[capturedLogs.length - 1];
  assert(log.level === 'info', 'Level debe ser "info"');
  assert(log.message === 'Test message', 'Message debe coincidir');
});

// Test 2: logInfo con contexto
test('logger: logInfo debe incluir contexto', () => {
  capturedLogs.length = 0;
  
  logInfo('Test', { requestId: '123', durationMs: 100 });
  
  assert(capturedLogs.length > 0, 'Debe haber registrado un log');
  const log = capturedLogs[capturedLogs.length - 1];
  assert(log.hasContext === true, 'Debe tener contexto');
});

// Test 3: logWarn debe registrar con nivel warn
test('logger: logWarn debe registrar con nivel warn', () => {
  capturedLogs.length = 0;
  
  logWarn('Warning message');
  
  assert(capturedLogs.length > 0, 'Debe haber registrado un log');
  const log = capturedLogs[capturedLogs.length - 1];
  assert(log.level === 'warn', 'Level debe ser "warn"');
});

// Test 4: logError debe registrar con nivel error
test('logger: logError debe registrar con nivel error', () => {
  capturedLogs.length = 0;
  
  logError('Error message');
  
  assert(capturedLogs.length > 0, 'Debe haber registrado un log');
  const log = capturedLogs[capturedLogs.length - 1];
  assert(log.level === 'error', 'Level debe ser "error"');
});

// Test 5: logDebug debe registrar con nivel debug
test('logger: logDebug debe registrar con nivel debug', () => {
  capturedLogs.length = 0;
  
  logDebug('Debug message');
  
  assert(capturedLogs.length > 0, 'Debe haber registrado un log');
  const log = capturedLogs[capturedLogs.length - 1];
  assert(log.level === 'debug', 'Level debe ser "debug"');
});

// Test 6: Múltiples logs se registran correctamente
test('logger: múltiples logs deben registrarse', () => {
  capturedLogs.length = 0;
  
  logInfo('First');
  logWarn('Second');
  logError('Third');
  
  assert(capturedLogs.length === 3, 'Deben registrarse 3 logs');
  assert(capturedLogs[0].level === 'info', 'Primer log debe ser info');
  assert(capturedLogs[1].level === 'warn', 'Segundo log debe ser warn');
  assert(capturedLogs[2].level === 'error', 'Tercer log debe ser error');
});

// ============== RESULTADOS ==============

setTimeout(() => {
  // Restaurar console
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  console.log('\n📋 Resultados:');
  console.log('─'.repeat(50));
  
  tests.forEach(t => {
    const icon = t.passed ? '✅' : '❌';
    console.log(`${icon} ${t.name}`);
    if (t.error) {
      console.log(`   └─ ${t.error.message}`);
    }
  });
  
  console.log('─'.repeat(50));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}, 1000);
