import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { MenuPage } from './pages/menu/MenuPage'
import { CozinhaPage } from './pages/cozinha/CozinhaPage'
import { GarcomPage } from './pages/garcom/GarcomPage'
import { AdminPage } from './pages/admin/AdminPage'
import { GerentePage } from './pages/gerente/GerentePage'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
