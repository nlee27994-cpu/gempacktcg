import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-7xl font-bold gem-text">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page got pulled from the set</h1>
      <p className="mt-2 text-slate-400">We couldn't find what you were looking for.</p>
      <Link to="/shop" className="btn-primary mt-8">Back to the shop</Link>
    </div>
  )
}
