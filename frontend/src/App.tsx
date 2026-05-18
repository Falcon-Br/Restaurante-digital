import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MenuPage } from './pages/menu/MenuPage'
import { QrCodePage } from './pages/QrCodePage'
import { CozinhaPage } from './pages/cozinha/CozinhaPage'
import { GarcomPage } from './pages/garcom/GarcomPage'
import { AdminPage } from './pages/admin/AdminPage'
import { GerentePage } from './pages/gerente/GerentePage'

function AppRoutes() {
  const location = useLocation()

  return (
    <div key={location.pathname.split('/')[1] || 'home'} className="route-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/qr/:token" element={<QrCodePage />} />
        <Route path="/menu/:token" element={<MenuPage />} />
        <Route path="/cozinha" element={
          <ProtectedRoute roles={['Cozinha']}>
            <CozinhaPage />
          </ProtectedRoute>
        } />
        <Route path="/garcom" element={
          <ProtectedRoute roles={['Garcom', 'Admin']}>
            <GarcomPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['Admin']}>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/gerente" element={
          <ProtectedRoute roles={['Gerente']}>
            <GerentePage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
