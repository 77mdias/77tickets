"use client";

export interface DiscoveryFilters {
  q: string;
  date: string;
  location: string;
  category: string;
}

export interface EventFiltersProps {
  filters: DiscoveryFilters;
  onChange: <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => void;
}

const fieldClassName = "rounded-md border border-zinc-300 px-3 py-2 text-sm";
const CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "shows", label: "Shows" },
  { value: "conferencias", label: "Conferencias" },
  { value: "esportes", label: "Esportes" },
  { value: "festas", label: "Festas" },
  { value: "educacao", label: "Educacao" },
  { value: "outros", label: "Outros" },
] as const;

export function EventFilters({ filters, onChange }: EventFiltersProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Descoberta</p>
          <p className="mt-1 text-sm text-zinc-600">
            Filtre os eventos por termo, data, local e categoria.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Buscar</span>
          <input
            className={fieldClassName}
            name="q"
            type="search"
            value={filters.q}
            onChange={(event) => onChange("q", event.target.value)}
            placeholder="Festival, corrida, conferência..."
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Data</span>
          <input
            className={fieldClassName}
            name="date"
            type="date"
            value={filters.date}
            onChange={(event) => onChange("date", event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Local</span>
          <input
            className={fieldClassName}
            name="location"
            type="text"
            value={filters.location}
            onChange={(event) => onChange("location", event.target.value)}
            placeholder="Sao Paulo, Recife..."
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Categoria</span>
          <select
            className={fieldClassName}
            name="category"
            value={filters.category}
            onChange={(event) => onChange("category", event.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
