#!/usr/bin/env node

/**
 * Script para generar iconos PWA de diferentes tamaños
 * Usa canvas y Sharp para crear SVG como base
 * 
 * Para usar este script:
 * 1. Instalar sharp: npm install --save-dev sharp
 * 2. Ejecutar: node scripts/generate-pwa-icons.js
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

// Crear directorio de iconos si no existe
const iconDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
  console.log(`✅ Directorio creado: ${iconDir}`);
}

// Tamaños a generar
const sizes = [192, 512, 1024];

// SVG base con gradiente teal
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14b8a6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d9488;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="256" height="256" fill="url(#grad)" rx="60"/>
  
  <!-- Spark/Star symbol -->
  <g transform="translate(128, 128)">
    <!-- Outer circle -->
    <circle cx="0" cy="0" r="80" fill="rgba(255,255,255,0.1)"/>
    
    <!-- Star shape -->
    <g transform="scale(1.5)">
      <path d="M 0,-35 L 8,-12 L 35,-8 L 14,8 L 22,35 L 0,20 L -22,35 L -14,8 L -35,-8 L -8,-12 Z" 
            fill="white" opacity="0.95"/>
    </g>
    
    <!-- Inner glow -->
    <circle cx="0" cy="0" r="20" fill="rgba(255,255,255,0.3)"/>
  </g>
  
  <!-- Decorative dots -->
  <circle cx="40" cy="40" r="8" fill="rgba(255,255,255,0.4)"/>
  <circle cx="216" cy="220" r="12" fill="rgba(255,255,255,0.3)"/>
  <circle cx="220" cy="40" r="6" fill="rgba(255,255,255,0.35)"/>
</svg>
`;

// Generar archivos SVG
console.log('📝 Generando archivos SVG de iconos...\n');

sizes.forEach(size => {
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconDir, filename);
  const svg = createSVG(size);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ ${filename} (${size}x${size})`);
});

console.log('\n✨ Iconos generados exitosamente!');
console.log('\n📌 Nota: Estos son archivos SVG.');
console.log('Para convertir a PNG, instala Sharp:');
console.log('  npm install --save-dev sharp');
console.log('\nLuego ejecuta:');
console.log('  npx ts-node scripts/convert-svg-to-png.ts');
