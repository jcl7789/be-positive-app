import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public', // Directorio donde se construirá el Service Worker
  // Deshabilitar PWA en desarrollo para evitar problemas de caché
  disable: process.env.NODE_ENV === 'development', 
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
};

export default withPWA(nextConfig);
