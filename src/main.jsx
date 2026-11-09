import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { LedgerProvider } from './context/LedgerContext'
import { AuctionProvider } from './context/AuctionContext'
import { SeriesProvider } from './context/SeriesContext'
import { VaultProvider } from './context/VaultContext'
import { loadCatalog } from './lib/catalog'
import './index.css'

const root = document.getElementById('root')
root.innerHTML = '<p style="padding:6rem 1rem;text-align:center;color:#94a3b8">Loading the shop…</p>'

// With Shopify connected, what's for sale comes from the store, so load it before the first render
loadCatalog().finally(() => ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <LedgerProvider>
        <CartProvider>
          <AuctionProvider>
            <VaultProvider>
              <SeriesProvider>
                <App />
              </SeriesProvider>
            </VaultProvider>
          </AuctionProvider>
        </CartProvider>
      </LedgerProvider>
    </BrowserRouter>
  </React.StrictMode>,
))
