import { ModuleKey } from "../../types";


const MODULE_META: Record<ModuleKey, { label: string; className: string }> = {
  POS:         { label: 'POS',          className: 'bg-orange-50 text-orange-700 border border-orange-200'  },
  FrontOffice: { label: 'Front Office', className: 'bg-amber-50 text-amber-700 border border-amber-200'    },
  MMS:         { label: 'MMS',          className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  Finance:     { label: 'Finance',      className: 'bg-red-50 text-red-700 border border-red-200'          },
  CRS:         { label: 'CRS',          className: 'bg-stone-50 text-stone-600 border border-stone-200'    },
}

export function ModuleBadge({ module }: { module: ModuleKey }) {
  const meta = MODULE_META[module]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}