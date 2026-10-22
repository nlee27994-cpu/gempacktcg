import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { LedgerProvider } from './context/LedgerContext'
import { AuctionProvider } from './context/AuctionContext'
import { SeriesProvider } from './context/SeriesContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LedgerProvider>
        <CartProvider>
          <AuctionProvider>
            <SeriesProvider>
              <App />
            </SeriesProvider>
          </AuctionProvider>
        </CartProvider>
      </LedgerProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
