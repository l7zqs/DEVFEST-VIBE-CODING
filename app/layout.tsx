import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tender package builder',
  description: 'Build and validate a tender PDF submission package locally in browser.',
  icons: {
    icon: [
      { url: '/icon.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon.png', media: '(prefers-color-scheme: dark)' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: 'white',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
