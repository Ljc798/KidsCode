export default function AdminRootLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Keep this layout minimal so /admin/login can have its own UI.
  return <>{children}</>
}

