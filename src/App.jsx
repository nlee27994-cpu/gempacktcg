import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import OpenPack from './pages/OpenPack'
import AuctionHouse from './pages/AuctionHouse'
import AuctionDetail from './pages/AuctionDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import About from './pages/About'
import AdminConsole from './pages/AdminConsole'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:id" element={<Product />} />
        <Route path="open/:id" element={<OpenPack />} />
        <Route path="auctions" element={<AuctionHouse />} />
        <Route path="auctions/:id" element={<AuctionDetail />} />
        <Route path="consign" element={<Navigate to="/auctions?tab=sell" replace />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-confirmed" element={<OrderConfirmation />} />
        <Route path="about" element={<About />} />
        <Route path="admin" element={<AdminConsole />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
