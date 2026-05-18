import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Mesa } from '../api/types'

export function QrCodePage() {
  const { token } = useParams<{ token: string }>()
  const [mesa, setMesa] = useState<Mesa | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let active = true

    const carregar = async () => {
      if (!token) {
        setErro(true)
        setLoading(false)
        return
      }

      try {
        const { data } = await api.get<Mesa>(`/mesas/token/${token}`)
        if (!active) return
        setMesa(data)
      } catch {
        if (!active) return
        setErro(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    void carregar()
    return () => {
      active = false
    }
  }, [token])

  const qrSrc = token ? `/api/mesas/token/${token}/qrcode` : ''
  const menuHref = token ? `/menu/${token}` : '/home'

  return (
    <main className="min-h-screen bg-[#f7f9ff] px-4 py-8 text-[#191c20]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="motion-panel overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-[#e6e8ee]">
          <div className="bg-[#191c20] px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-[#ffcc66]">restaurant_menu</span>
              <div>
                <p className="text-lg font-black leading-tight">Restaurante Digital</p>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Acesso publico</p>
              </div>
            </div>
          </div>

          <div className="p-6 text-center">
            {loading && (
              <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined animate-spin text-4xl text-[#b90014]">progress_activity</span>
                <p className="text-sm font-bold text-[#5d3f3c]">Carregando QR da mesa...</p>
              </div>
            )}

            {!loading && erro && (
              <div className="flex min-h-[22rem] flex-col items-center justify-center gap-4">
                <span className="material-symbols-outlined text-5xl text-[#b90014]">qr_code_2_off</span>
                <div>
                  <h1 className="text-2xl font-black">QR nao encontrado</h1>
                  <p className="mt-2 text-sm leading-relaxed text-[#5d3f3c]">
                    Confira se o link esta correto ou solicite um novo QR para a equipe do restaurante.
                  </p>
                </div>
                <Link to="/home" className="rounded-xl bg-[#191c20] px-5 py-3 text-sm font-black text-white">
                  Voltar ao inicio
                </Link>
              </div>
            )}

            {!loading && mesa && (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-[#926e6b]">Mesa {mesa.numero}</p>
                <h1 className="mt-2 text-3xl font-black">Aponte a camera para abrir o cardapio</h1>
                <div className="mx-auto mt-6 max-w-[17rem] rounded-3xl bg-[#f7f9ff] p-4 ring-1 ring-[#e6e8ee]">
                  <img src={qrSrc} alt={`QR Code da mesa ${mesa.numero}`} className="h-full w-full rounded-2xl bg-white" />
                </div>
                <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed text-[#5d3f3c]">
                  Este QR abre o cardapio publico desta mesa, sem login.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link to={menuHref} className="rounded-xl bg-[#b90014] px-5 py-3 text-sm font-black text-white">
                    Abrir cardapio
                  </Link>
                  <a
                    href={qrSrc}
                    download={`mesa-${mesa.numero}-qr.png`}
                    className="rounded-xl bg-[#f2f3f9] px-5 py-3 text-sm font-black text-[#5d3f3c] ring-1 ring-[#e6e8ee]"
                  >
                    Baixar PNG
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
