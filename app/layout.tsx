import type {Metadata} from 'next';
import { Inter, Noto_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const notoSans = Noto_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-noto',
});

export const metadata: Metadata = {
  title: 'MyLux | Luxian Network',
  description: 'Official website for Luxian Network Minecraft Server',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${notoSans.variable} font-sans bg-[#1e1e1e] text-white overflow-x-hidden antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
