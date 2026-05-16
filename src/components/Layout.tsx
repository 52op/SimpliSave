import { ReactNode } from "react"
import Header from "./Header"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-100 py-3 text-center text-gray-500 text-xs">
        SimpliSave
      </footer>
    </div>
  )
}