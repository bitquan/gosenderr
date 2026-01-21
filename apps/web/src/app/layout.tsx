import type { Metadata } from 'next';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navbar } from '@/components/v2/Navbar';

export const metadata: Metadata = {
  title: 'GoSenderr - On-Demand Delivery',
  description: 'Send packages with GoSenderr',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar>{children}</Navbar>
      </body>
    </html>
  );
}
