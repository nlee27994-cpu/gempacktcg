import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { ConsignProvider } from './context/ConsignContext'
import { SeriesProvider } from './context/SeriesContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <ConsignProvider>
          <SeriesProvider>
            <App />
          </SeriesProvider>
        </ConsignProvider>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
