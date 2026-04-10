import { useAuth } from '../../context/AuthContext'

export function GerentePage() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">📊 Gerente</h1>
        <button onClick={logout} className="text-sm opacity-80">Sair</button>
      </div>
      <div className="flex items-center justify-center h-64 text-gray-400">
        Relatórios disponíveis no Plano 4
      </div>
    </div>
  )
}
