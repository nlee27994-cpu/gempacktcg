import { createContext, useContext, useMemo, useState } from 'react'

// Consignment submissions live in React state only (cleared on refresh) — this is a demo.
const ConsignContext = createContext(null)

export function ConsignProvider({ children }) {
  const [submissions, setSubmissions] = useState([])

  const value = useMemo(
    () => ({
      submissions,
      submit: (form) => {
        const entry = {
          ...form,
          id: `cs-${Date.now()}`,
          submittedAt: new Date().toISOString(),
          status: 'Under review',
        }
        setSubmissions((prev) => [entry, ...prev])
        return entry
      },
      withdraw: (id) => setSubmissions((prev) => prev.filter((s) => s.id !== id)),
    }),
    [submissions],
  )

  return <ConsignContext.Provider value={value}>{children}</ConsignContext.Provider>
}

export const useConsign = () => useContext(ConsignContext)
