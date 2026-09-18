import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Smashed Burger Erbil | Best Smash Burgers in Erbil, Iraq",
  description: "Erbil's boldest smash burgers. 100% fresh beef, crispy edges, melted cheese. Dine-in, takeaway & delivery in Erbil. Order now!",
  generator: 'v0.app',
  keywords: ['burger Erbil', 'best burger Erbil', 'smash burger Erbil', 'restaurant Erbil'],
  openGraph: {
    title: "Smashed Burger Erbil | Best Smash Burgers in Erbil, Iraq",
    description: "Erbil's boldest smash burgers. Fresh beef, crispy edges, melted cheese.",
    type: 'website',
    locale: 'en_IQ',
    images: ['/smashed-burger-hero.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
