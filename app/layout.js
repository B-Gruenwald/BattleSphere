import './globals.css'

export const metadata = {
  title: 'Warzones — Narrative Campaign Platform',
  description: 'Organise map-based narrative campaigns for tabletop wargaming groups. Track territorial conquest, chronicle emergent stories, and run campaigns that endure.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}