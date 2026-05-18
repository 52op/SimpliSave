import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./stores/authStore"
import { useTranslation } from "react-i18next"
import Home from "./pages/Home"
import Bookmarks from "./pages/Bookmarks"
import Memos from "./pages/Memos"
import Login from "./pages/Login"
import Register from "./pages/Register"
import AdminCategories from "./pages/admin/AdminCategories"
import AdminSubmissions from "./pages/admin/AdminSubmissions"
import AdminBookmarks from "./pages/admin/AdminBookmarks"
import AdminSearchEngines from "./pages/admin/AdminSearchEngines"
import AdminImageBeds from "./pages/admin/AdminImageBeds"
import CardGroupDetail from "./pages/CardGroupDetail"
import SearchPage from "./pages/Search"
import Header from "./components/Header"
import "./index.css"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== "admin") return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { t } = useTranslation()
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
            <Route path="/memos" element={<ProtectedRoute><Memos /></ProtectedRoute>} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/g/:slug" element={<CardGroupDetail />} />
            <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
            <Route path="/admin/submissions" element={<AdminRoute><AdminSubmissions /></AdminRoute>} />
            <Route path="/admin/bookmarks" element={<AdminRoute><AdminBookmarks /></AdminRoute>} />
            <Route path="/admin/search-engines" element={<AdminRoute><AdminSearchEngines /></AdminRoute>} />
            <Route path="/admin/imagebeds" element={<AdminRoute><AdminImageBeds /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="bg-gray-100 py-4 mt-8">
          <div className="container mx-auto text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} SimpliSave — {t("app.description")}
          </div>
        </footer>
      </div>
    </Router>
  )
}
