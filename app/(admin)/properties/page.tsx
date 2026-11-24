'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, MapPin } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { ModuleBadge } from '../components/modules/ModuleIcon'
import { Property } from '../types'

type StatusPill = {
  label: string
  className: string
}

function getStatusPill(property: Property): StatusPill {
  const moduleCount = Array.isArray(property.modules) ? property.modules.length : 0

  if (moduleCount === 0) {
    return { label: 'No modules', className: 'bg-gray-100 text-gray-700' }
  }

  return { label: 'Configured', className: 'bg-green-100 text-green-700' }
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch('/api/properties')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to load properties')
        setProperties(data.properties || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load properties')
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [])

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Properties"
        action={
          <button
            onClick={() => router.push('/properties/create-property')}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={13} /> Add Property
          </button>
        }
      />

      <main className="flex-1 bg-gray-100 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-500 font-mono">{p.code}</p>
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                  </div>
                </div>
                {(() => {
                  const pill = getStatusPill(p)
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pill.className}`}>
                      {pill.label}
                    </span>
                  )
                })()}
              </div>

              {p.address && (
                <div className="flex items-start gap-1.5 mb-3">
                  <MapPin size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-400">{p.address}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {p.modules.map((m) => (
                  <ModuleBadge key={m} module={m} />
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {(p.users ?? []).length} user{(p.users ?? []).length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => router.push(`/properties/${p.id}`)}
                  className="text-xs text-orange-500 font-medium hover:underline"
                >
                  View details →
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}