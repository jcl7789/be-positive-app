/**
 * Tests para src/lib/retry.ts
 * 
 * Estos son tests básicos que pueden ejecutarse con Node.js
 * Para ejecutar: node __tests__/lib/retry.test.ts
 * 
 * Para testing más robusto, usar:
 * npm install --save-dev vitest
 */

import { withExponentialBackoff, safeJsonParse } from '../../src/lib/retry';

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

console.log('🧪 Ejecutando tests para retry.ts...\n');

// Test 1: withExponentialBackoff - éxito en primer intento
test('withExponentialBackoff: debe ejecutar función exitosamente', async () => {
  const mockFn = async () => 'success';
  const result = await withExponentialBackoff(mockFn);
  
  assert(result.success === true, 'Success debe ser true');
  assert(result.data === 'success', 'Data debe ser "success"');
  assert(result.attempts === 1, 'Attempts debe ser 1');
});

// Test 2: withExponentialBackoff - falla después de maxAttempts
test('withExponentialBackoff: debe fallar después de maxAttempts', async () => {
  let callCount = 0;
  const mockFn = async () => {
    callCount++;
    throw new Error('Network error');
  };
  
  const result = await withExponentialBackoff(mockFn, {
    maxAttempts: 3,
    initialDelayMs: 10,
  });
  
  assert(result.success === false, 'Success debe ser false');
  assert(result.attempts === 3, 'Attempts debe ser 3');
  assert(callCount === 3, 'Función debe ser llamada 3 veces');
});

// Test 3: safeJsonParse - JSON válido
test('safeJsonParse: debe parsear JSON válido', () => {
  const json = '{"name": "test", "value": 123}';
  const result = safeJsonParse(json) as Record<string, number | string>;
  
  assert(result.name === 'test', 'name debe ser "test"');
  assert(result.value === 123, 'value debe ser 123');
});

// Test 4: safeJsonParse - validar campos requeridos
test('safeJsonParse: debe validar campos requeridos', () => {
  const json = '{"name": "test"}';
  
  try {
    safeJsonParse(json, ['name', 'email']);
    assert(false, 'Debería lanzar error por campo faltante');
  } catch (error) {
    assert(error instanceof Error, 'Error debe ser instancia de Error');
    assert((error as Error).message.includes('email'), 'Error debe mencionar "email"');
  }
});

// Test 5: safeJsonParse - JSON inválido
test('safeJsonParse: debe rechazar JSON inválido', () => {
  const invalidJson = '{invalid json}';
  
  try {
    safeJsonParse(invalidJson);
    assert(false, 'Debería lanzar error para JSON inválido');
  } catch (error) {
    assert(error instanceof Error, 'Error debe ser instancia de Error');
    assert((error as Error).message.includes('Invalid JSON'), 'Error debe mencionar "Invalid JSON"');
  }
});

// Test 6: safeJsonParse - string vacío
test('safeJsonParse: debe rechazar strings vacíos', () => {
  try {
    safeJsonParse('');
    assert(false, 'Debería lanzar error para string vacío');
  } catch (error) {
    assert(error instanceof Error, 'Error debe ser instancia de Error');
    assert((error as Error).message.includes('Empty'), 'Error debe mencionar "Empty"');
  }
});

// Test 7: safeJsonParse - valores no-string
test('safeJsonParse: debe rechazar valores no-string', () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeJsonParse(null as any);
    assert(false, 'Debería lanzar error para null');
  } catch (error) {
    assert(error instanceof Error, 'Error debe ser instancia de Error');
    assert((error as Error).message.includes('Invalid'), 'Error debe mencionar "Invalid"');
  }
});

// Test 8: safeJsonParse - manejar whitespace
test('safeJsonParse: debe manejar JSON con whitespace', () => {
  const json = '  {"test": "value"}  \n';
  const result = safeJsonParse(json) as Record<string, unknown>;
  
  assert(result.test === 'value', 'Debe parsear correctamente con whitespace');
});

// ============== RESULTADOS ==============

// Esperar a que se completen todos los tests async
setTimeout(() => {
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
}, 5000);

