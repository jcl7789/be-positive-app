#!/usr/bin/env node

/**
 * Test runner - ejecuta todos los tests
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');

console.log('🧪 Be Positive App - Test Suite\n');

const testFiles = [
  '__tests__/lib/retry.test.ts',
  '__tests__/lib/cache.test.ts',
  '__tests__/lib/logger.test.ts',
];

// Función simple para ejecutar TypeScript con tsx si está disponible
function runTest(file) {
  console.log(`📄 ${file}`);
  console.log('─'.repeat(50));
  
  try {
    // Intentar usar tsx si está instalado
    try {
      execSync(`npx tsx ${file}`, { stdio: 'inherit' });
    } catch {
      // Si tsx no está disponible, intentar con ts-node
      execSync(`npx ts-node ${file}`, { stdio: 'inherit' });
    }
  } catch {
    console.error(`❌ Test failed: ${file}`);
    return;
  }
  
  console.log();
}

// Ejecutar tests
testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    runTest(file);
  } else {
    console.log(`⚠️  No encontrado: ${file}\n`);
  }
});

console.log('═'.repeat(50));
console.log('✅ Test suite completed\n');
