import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Be positive',
  description: 'Your daily dose of positive quotes.',
  // Referencia al Manifest para la PWA
  manifest: '/manifest.json', 
  // Configuración adicional de iOS para instalación
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dosis Positiva',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}