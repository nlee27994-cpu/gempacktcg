import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import Toasts from './Toasts'
import { catalogError } from '../lib/catalog'

export default function Layout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {catalogError && (
        <p role="alert" className="bg-rose-500/15 px-4 py-2 text-center text-sm text-rose-200">
          We couldn't reach the store, so nothing is for sale right now. Please refresh in a minute.
        </p>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toasts />
    </div>
  )
}
