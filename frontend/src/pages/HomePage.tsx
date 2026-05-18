import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { MesaPublicQr } from '../api/types'

const foodImages = [
  '/demo-images/burger-artesanal.png',
  '/demo-images/risoto-de-cogumelos.png',
  '/demo-images/suco-natural.png',
  '/demo-images/brownie-com-sorvete.png',
]

const flows = [
  {
    icon: 'qr_code_2',
    title: 'Cliente pelo QR Code',
    text: 'A mesa abre o cardapio publico por QR ou link direto, escolhe itens, adiciona observacoes e envia o pedido.',
  },
  {
    icon: 'room_service',
    title: 'Garcom no salao',
    text: 'A equipe acompanha mesas, comandas e pedidos prontos para entrega em uma tela pensada para o turno.',
  },
  {
    icon: 'skillet',
    title: 'Cozinha em tempo real',
    text: 'O KDS organiza itens pendentes por urgencia e permite marcar preparo, pronto e esgotado sem recarregar.',
  },
  {
    icon: 'monitoring',
    title: 'Gestao do restaurante',
    text: 'Admin e gerente cuidam de cardapio, mesas, disponibilidade, vendas e historico operacional.',
  },
]

const metrics = [
  { value: '4', label: 'perfis internos' },
  { value: 'QR', label: 'acesso publico' },
  { value: 'Live', label: 'SignalR' },
]

const carouselAccents = ['#b90014', '#d97706', '#428057', '#2563eb', '#9333ea', '#ea580c']

const liveQueue = [
  { table: 'Mesa 08', item: 'Burger artesanal', status: 'Preparando', tone: '#d97706' },
  { table: 'Mesa 03', item: 'Risoto de cogumelos', status: 'Pronto', tone: '#428057' },
  { table: 'Mesa 12', item: 'Suco natural', status: 'Novo pedido', tone: '#b90014' },
]

function displayPath(url: string) {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

export function HomePage() {
  const [qrCarouselItems, setQrCarouselItems] = useState<MesaPublicQr[]>([])
  const [activeQrIndex, setActiveQrIndex] = useState(0)
  const [loadingQrs, setLoadingQrs] = useState(true)
  const [carouselTick, setCarouselTick] = useState(0)
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [modalTodosQrs, setModalTodosQrs] = useState(false)
  const [modalQrPage, setModalQrPage] = useState(0)

  const dragMovedRef = useRef(false)
  const lastManualTransitionRef = useRef(0)
  const mainCarouselItems = qrCarouselItems.slice(0, 10)
  const activeQr = mainCarouselItems[activeQrIndex] ?? null
  const hasMoreQrs = qrCarouselItems.length > 10
  const modalTotalPages = Math.max(1, Math.ceil(qrCarouselItems.length / 10))
  const modalPageItems = qrCarouselItems.slice(modalQrPage * 10, modalQrPage * 10 + 10)

  useEffect(() => {
    let active = true

    const carregarQrs = async () => {
      try {
        const { data } = await api.get<MesaPublicQr[]>('/mesas/public')
        if (!active) return
        setQrCarouselItems(data)
        setActiveQrIndex(0)
      } catch {
        if (!active) return
        setQrCarouselItems([])
      } finally {
        if (active) setLoadingQrs(false)
      }
    }

    void carregarQrs()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (mainCarouselItems.length <= 1) return

    const timer = window.setTimeout(() => {
      if (Date.now() - lastManualTransitionRef.current < 650) {
        setCarouselTick(prev => prev + 1)
        return
      }
      setActiveQrIndex(prev => (prev + 1) % mainCarouselItems.length)
      setCarouselTick(prev => prev + 1)
    }, 3600)

    return () => window.clearTimeout(timer)
  }, [mainCarouselItems.length, activeQrIndex, carouselTick])

  useEffect(() => {
    if (activeQrIndex >= mainCarouselItems.length) setActiveQrIndex(0)
  }, [activeQrIndex, mainCarouselItems.length])

  useEffect(() => {
    if (modalQrPage >= modalTotalPages) setModalQrPage(0)
  }, [modalQrPage, modalTotalPages])

  const restartAutoTransition = () => {
    lastManualTransitionRef.current = Date.now()
    setCarouselTick(prev => prev + 1)
  }

  const goToQr = (direction: -1 | 1) => {
    if (mainCarouselItems.length === 0) return
    setActiveQrIndex(prev => (prev + direction + mainCarouselItems.length) % mainCarouselItems.length)
    restartAutoTransition()
  }

  const goToQrIndex = (index: number) => {
    setActiveQrIndex(index)
    restartAutoTransition()
  }

  const handleDragStart = (clientX: number) => {
    setDragStartX(clientX)
    dragMovedRef.current = false
  }

  const handleDragMove = (clientX: number) => {
    if (dragStartX === null) return
    if (Math.abs(clientX - dragStartX) > 10) dragMovedRef.current = true
  }

  const handleDragEnd = (clientX: number) => {
    if (dragStartX === null) return
    const delta = clientX - dragStartX
    setDragStartX(null)
    if (Math.abs(delta) < 48) return
    goToQr(delta < 0 ? -1 : 1)
  }

  const goToModalPage = (direction: -1 | 1) => {
    setModalQrPage(prev => (prev + direction + modalTotalPages) % modalTotalPages)
  }

  return (
    <div className="min-h-screen bg-[#fffdf9] text-[#191c20]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-[#191c20]/75 px-4 py-3 text-white backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/home" className="flex min-w-0 items-center gap-2 text-white no-underline">
            <span className="material-symbols-outlined text-2xl text-[#ffcc66]">restaurant_menu</span>
            <span className="truncate text-sm font-black tracking-tight sm:text-base">Restaurante Digital</span>
          </Link>
          <nav className="flex items-center gap-2">
            <a
              href="#fluxos"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              Fluxos
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-[#b90014] shadow-sm transition hover:bg-[#fff3f3]"
            >
              <span className="material-symbols-outlined text-base">login</span>
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[760px] items-center overflow-hidden bg-[#191c20] px-4 pb-12 pt-24 text-white">
          <div className="home-hero-collage absolute inset-0 opacity-80">
            {foodImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                className={`home-hero-photo home-hero-photo-${index + 1}`}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(255,255,255,0.1),transparent_28%),linear-gradient(90deg,#191c20_0%,rgba(25,28,32,0.9)_40%,rgba(25,28,32,0.58)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#191c20] via-[#191c20]/20 to-[#191c20]/25" />

          <div className="relative mx-auto grid w-full max-w-[1240px] gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-8">
            <div className="max-w-2xl motion-panel lg:pr-8">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-[#ffcc66] ring-1 ring-white/15">
                <span className="material-symbols-outlined text-base">bolt</span>
                Cardapio, pedidos e cozinha conectados
              </p>
              <h1 className="text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
                Restaurante Digital
              </h1>
              <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-white/80">
                Um app de operacao para restaurantes: cliente pede pelo QR Code, a cozinha recebe em tempo real,
                o garcom acompanha mesas e o gerente enxerga resultados.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#b90014] px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:bg-[#d4001a]"
                >
                  <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                  Acessar perfis internos
                </Link>
                <a
                  href="#cliente"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/12 px-5 py-3 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/20"
                >
                  <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                  Ver acesso do cliente
                </a>
              </div>
            </div>

            <div className="motion-panel hidden lg:flex lg:justify-center">
              <div className="w-full max-w-[640px] rounded-xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur-md">
                <div className="grid grid-cols-3 gap-3">
                  {metrics.map(metric => (
                    <div key={metric.label} className="rounded-lg bg-white px-3 py-4 text-center text-[#191c20]">
                      <p className="text-2xl font-black text-[#b90014]">{metric.value}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#5d3f3c]">{metric.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-[1.12fr_0.88fr] gap-4">
                  <div className="rounded-lg bg-white p-5 text-[#191c20]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-[#926e6b]">Carrossel QR</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => goToQr(-1)}
                          className="home-carousel-nav"
                          aria-label="QR anterior"
                          disabled={mainCarouselItems.length <= 1}
                        >
                          <span className="material-symbols-outlined text-sm">arrow_back</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => goToQr(1)}
                          className="home-carousel-nav"
                          aria-label="Próximo QR"
                          disabled={mainCarouselItems.length <= 1}
                        >
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    <div
                      className="home-qr-carousel mt-4"
                      onMouseDown={e => handleDragStart(e.clientX)}
                      onMouseMove={e => handleDragMove(e.clientX)}
                      onMouseUp={e => handleDragEnd(e.clientX)}
                      onMouseLeave={e => handleDragEnd(e.clientX)}
                      onDragStart={e => e.preventDefault()}
                      onTouchStart={e => handleDragStart(e.touches[0].clientX)}
                      onTouchMove={e => handleDragMove(e.touches[0].clientX)}
                      onTouchEnd={e => {
                        const touch = e.changedTouches[0]
                        if (touch) handleDragEnd(touch.clientX)
                      }}
                    >
                      {loadingQrs && (
                        <div className="home-qr-slide flex flex-col items-center justify-center gap-3">
                          <span className="material-symbols-outlined animate-spin text-3xl text-[#b90014]">progress_activity</span>
                          <p className="text-center text-[11px] font-semibold text-[#926e6b]">
                            Carregando QRs reais das mesas
                          </p>
                        </div>
                      )}

                      {!loadingQrs && activeQr && (
                        <div key={activeQr.qrCodeToken} className="home-qr-slide tab-panel">
                          <div className="image-frame mx-auto h-52 w-52 overflow-hidden rounded-lg bg-white p-2 ring-1 ring-[#e6e8ee]">
                            <img
                              src={activeQr.qrCodeImageUrl}
                              alt={`QR Code da mesa ${activeQr.numero}`}
                              loading="eager"
                              decoding="async"
                              draggable={false}
                              className="smooth-image h-full w-full rounded-[6px] bg-white object-cover"
                            />
                          </div>
                          <p className="mt-4 text-center text-xs font-black uppercase tracking-widest text-[#5d3f3c]">
                            Mesa {activeQr.numero}
                          </p>
                          <p className="mt-1 text-center text-[11px] font-semibold text-[#926e6b]">
                            Pagina publica do QR
                          </p>
                        </div>
                      )}

                      {!loadingQrs && !activeQr && (
                        <div className="home-qr-slide flex flex-col items-center justify-center gap-3">
                          <span className="material-symbols-outlined text-3xl text-[#b90014]">qr_code_2_off</span>
                          <p className="text-center text-[11px] font-semibold text-[#926e6b]">
                            Cadastre mesas para exibir os QRs reais aqui.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-center gap-2">
                      {mainCarouselItems.map((item, index) => (
                        <button
                          key={item.qrCodeToken}
                          type="button"
                          aria-label={`Mostrar mesa ${item.numero}`}
                          onClick={() => goToQrIndex(index)}
                          className="h-2.5 rounded-full transition-all"
                          style={{
                            width: activeQrIndex === index ? '1.75rem' : '0.625rem',
                            background: activeQrIndex === index ? carouselAccents[index % carouselAccents.length] : '#d0d3df',
                          }}
                        />
                      ))}
                    </div>
                    {hasMoreQrs && (
                      <button
                        type="button"
                        onClick={() => {
                          setModalQrPage(0)
                          setModalTodosQrs(true)
                        }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-widest"
                        style={{ background: '#f2f3f9', color: '#5d3f3c', border: '1px solid #e6e8ee' }}
                      >
                        <span className="material-symbols-outlined text-base">apps</span>
                        Ver todas as mesas ({qrCarouselItems.length})
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 rounded-lg bg-[#f7f9ff] p-4 text-[#191c20]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-[#926e6b]">Fila ao vivo</p>
                      <span className="rounded-full bg-[#e9f7ee] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#428057]">
                        online
                      </span>
                    </div>
                    <div className="mt-3 min-w-0 rounded-xl bg-white p-3 ring-1 ring-[#e6e8ee]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black" style={{ color: activeQr ? carouselAccents[activeQrIndex % carouselAccents.length] : '#b90014' }}>
                          {activeQr ? `Mesa ${activeQr.numero}` : 'Sem mesas'}
                        </p>
                        <span
                          className="rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                          style={{ background: activeQr ? carouselAccents[activeQrIndex % carouselAccents.length] : '#b90014' }}
                        >
                          publico
                        </span>
                      </div>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#926e6b]">Rota do QR</p>
                      <p className="home-token-line mt-1 max-w-full text-xs font-bold leading-snug" style={{ color: activeQr ? carouselAccents[activeQrIndex % carouselAccents.length] : '#b90014' }}>
                        {activeQr ? `/qr/${activeQr.qrCodeToken}` : '/qr/:token'}
                      </p>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#926e6b]">Destino do cardapio</p>
                      <p className="home-token-line mt-1 max-w-full text-xs font-bold leading-snug text-[#191c20]">
                        {activeQr ? displayPath(activeQr.qrCodeUrl) : '/menu/:token'}
                      </p>
                      <p className="mt-3 text-xs font-semibold leading-relaxed text-[#5d3f3c]">
                        {activeQr
                          ? 'Este QR foi gerado pelo backend e ja pode ser usado pelo cliente sem login.'
                          : 'Os QRs reais aparecem aqui assim que houver mesas cadastradas no sistema.'}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2 motion-list">
                      {liveQueue.map(item => (
                        <div key={`${item.table}-${item.item}`} className="rounded-lg bg-white p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black">{item.table}</p>
                            <span className="h-2 w-2 rounded-full" style={{ background: item.tone }} />
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-[#5d3f3c]">{item.item}</p>
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest" style={{ color: item.tone }}>
                            {item.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="cliente" className="border-b border-[#eadfda] bg-white px-4 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#b90014]">Acesso publico</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal text-[#191c20] md:text-4xl">
                O cliente entra pelo QR Code ou por um link direto da mesa.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#5d3f3c]">
                A rota publica ja fica separada dos perfis internos: cada mesa aponta para um endereco como
                <span className="font-bold text-[#191c20]"> /menu/:token</span>. Esse mesmo endereco pode ser impresso
                no QR Code, enviado por mensagem ou aberto direto no navegador.
              </p>
            </div>

            <div className="motion-list grid gap-4 sm:grid-cols-2">
              <div className="interactive-card rounded-lg border border-[#eadfda] bg-[#fff8ef] p-5">
                <span className="material-symbols-outlined text-4xl text-[#b90014]">qr_code_2</span>
                <h3 className="mt-4 text-lg font-black">QR na mesa</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5d3f3c]">
                  O admin gera o QR, imprime e o cliente cai direto no cardapio daquela mesa.
                </p>
              </div>
              <div className="interactive-card rounded-lg border border-[#d9eadf] bg-[#f3fbf5] p-5">
                <span className="material-symbols-outlined text-4xl text-[#428057]">link</span>
                <h3 className="mt-4 text-lg font-black">Link direto</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#315840]">
                  O restaurante tambem pode compartilhar o mesmo link publico para abrir o cardapio sem login.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="fluxos" className="bg-[#f7f9ff] px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-[#b90014]">Fluxos principais</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal text-[#191c20] md:text-4xl">
                Uma operacao inteira acompanhada em telas simples.
              </h2>
            </div>
            <div className="motion-list mt-8 grid gap-4 md:grid-cols-4">
              {flows.map(flow => (
                <article key={flow.title} className="interactive-card rounded-lg bg-white p-5 shadow-sm ring-1 ring-[#e6e8ee]">
                  <span className="material-symbols-outlined text-3xl text-[#b90014]">{flow.icon}</span>
                  <h3 className="mt-4 text-base font-black">{flow.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5d3f3c]">{flow.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {modalTodosQrs && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(6px)' }}
          onClick={e => {
            if (e.target === e.currentTarget) setModalTodosQrs(false)
          }}
        >
          <section className="modal-surface flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-[#191c20] shadow-2xl">
            <header className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: '1px solid #e6e8ee' }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#b90014]">Todos os QRs</p>
                <h2 className="text-xl font-black">Mesas do restaurante</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToModalPage(-1)}
                  className="home-carousel-nav"
                  aria-label="Pagina anterior"
                  disabled={modalTotalPages <= 1}
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <span className="min-w-20 text-center text-xs font-black uppercase tracking-widest text-[#926e6b]">
                  {modalQrPage + 1}/{modalTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToModalPage(1)}
                  className="home-carousel-nav"
                  aria-label="Proxima pagina"
                  disabled={modalTotalPages <= 1}
                >
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTodosQrs(false)}
                  className="home-carousel-nav"
                  aria-label="Fechar"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <div key={modalQrPage} className="tab-panel grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {modalPageItems.map((mesa, index) => {
                  const accent = carouselAccents[(modalQrPage * 10 + index) % carouselAccents.length]
                  return (
                    <article key={mesa.qrCodeToken} className="interactive-card rounded-lg bg-[#f7f9ff] p-3 text-center ring-1 ring-[#e6e8ee]">
                      <div className="image-frame mx-auto h-32 w-32 overflow-hidden rounded-lg bg-white p-2 ring-1 ring-[#e6e8ee]">
                        <img
                          src={mesa.qrCodeImageUrl}
                          alt={`QR Code da mesa ${mesa.numero}`}
                          loading="lazy"
                          decoding="async"
                          className="smooth-image h-full w-full rounded-[6px] bg-white object-cover"
                        />
                      </div>
                      <p className="mt-3 text-xs font-black uppercase tracking-widest" style={{ color: accent }}>
                        Mesa {mesa.numero}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-[#5d3f3c]">
                        {displayPath(mesa.qrCodeUrl)}
                      </p>
                      <a
                        href={mesa.qrPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-black text-white"
                        style={{ background: accent }}
                      >
                        Abrir QR
                      </a>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
