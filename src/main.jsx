import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { AuctionProvider } from './context/AuctionContext'
import { SeriesProvider } from './context/SeriesContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <AuctionProvider>
          <SeriesProvider>
            <App />
          </SeriesProvider>
        </AuctionProvider>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
