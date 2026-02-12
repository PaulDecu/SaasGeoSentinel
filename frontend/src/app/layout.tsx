import './global.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GeoSentinel - Security & Tech Platform',
  description: 'Plateforme de gestion des risques géolocalisés - Sécurité & Technologie',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            // Style des notifications flashy sur fond clair
            style: {
              background: '#fff',
              color: '#0f172a',
              border: '2px solid rgba(6, 182, 212, 0.5)',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
              fontWeight: '600',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
              style: {
                border: '2px solid rgba(34, 197, 94, 0.5)',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              style: {
                border: '2px solid rgba(239, 68, 68, 0.5)',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
              },
            },
          }}
        />
      </body>
    </html>
  );
}