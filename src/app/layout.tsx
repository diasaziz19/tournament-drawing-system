import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tournament Drawing & Management System | Cloud Real-time',
  description: 'Multi-user Online Tournament Drawing, Knockout Bracket Balancing & Schedule Management powered by Google Firebase and Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
