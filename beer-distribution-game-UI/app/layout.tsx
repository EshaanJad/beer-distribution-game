import type { Metadata } from 'next'
import './globals.css'
import { AppHeader } from '@/components/app-header'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Beer Distribution Game',
  description: 'Interactive supply chain management simulation',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppHeader />
        <main className="container mx-auto py-6 px-4 md:px-6">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
