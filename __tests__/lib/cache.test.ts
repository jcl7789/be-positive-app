/**
 * Tests para src/lib/cache.ts
 */

import { getCachedPhrase, setCachedPhrase, clearCache, getCacheInfo } from '../../src/lib/cache';
import type { PhraseResponse } from '../../src/lib/types';

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

console.log('🧪 Ejecutando tests para cache.ts...\n');

// Test 1: getCachedPhrase retorna null cuando está vacío
test('cache: getCachedPhrase debe retornar null cuando está vacío', () => {
  clearCache();
  const cached = getCachedPhrase();
  assert(cached === null, 'Debe retornar null cuando caché está vacío');
});

// Test 2: setCachedPhrase y getCachedPhrase
test('cache: debe guardar y recuperar frase', () => {
  clearCache();
  const phrase: PhraseResponse = {
    message: 'Test message',
    category: 'Fuerza',
  };
  
  setCachedPhrase(phrase);
  const cached = getCachedPhrase();
  
  assert(cached !== null, 'Cached no debe ser null');
  assert((cached as PhraseResponse).message === 'Test message', 'Message debe coincidir');
  assert((cached as PhraseResponse).category === 'Fuerza', 'Category debe coincidir');
});

// Test 3: clearCache debe limpiar el caché
test('cache: clearCache debe limpiar el caché', () => {
  const phrase: PhraseResponse = {
    message: 'Test',
    category: 'Amor',
  };
  
  setCachedPhrase(phrase);
  clearCache();
  
  const cached = getCachedPhrase();
  assert(cached === null, 'Caché debe estar vacío después de limpiar');
});

// Test 4: getCacheInfo retorna estado correcto cuando vacío
test('cache: getCacheInfo debe retornar cached: false cuando vacío', () => {
  clearCache();
  const info = getCacheInfo();
  
  assert(info.cached === false, 'cached debe ser false cuando está vacío');
  assert(info.ageInMinutes === undefined, 'ageInMinutes debe ser undefined cuando vacío');
});

// Test 5: getCacheInfo retorna estado correcto cuando hay caché
test('cache: getCacheInfo debe retornar cached: true cuando hay datos', () => {
  clearCache();
  const phrase: PhraseResponse = {
    message: 'Test',
    category: 'Esperanza',
  };
  
  setCachedPhrase(phrase);
  const info = getCacheInfo();
  
  assert(info.cached === true, 'cached debe ser true');
  assert(typeof info.ageInMinutes === 'number', 'ageInMinutes debe ser número');
  assert((info.ageInMinutes || 0) >= 0, 'ageInMinutes debe ser >= 0');
});

// Test 6: Edad del caché aumenta con el tiempo
test('cache: la edad del caché debe aumentar con el tiempo', async () => {
  clearCache();
  const phrase: PhraseResponse = {
    message: 'Test',
    category: 'Gratitud',
  };
  
  setCachedPhrase(phrase);
  const info1 = getCacheInfo();
  
  // Esperar 100ms
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const info2 = getCacheInfo();
  
  assert((info2.ageInMinutes || 0) >= (info1.ageInMinutes || 0), 'La edad debe aumentar o mantenerse igual');
});

// ============== RESULTADOS ==============

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
