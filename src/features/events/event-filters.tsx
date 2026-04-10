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

const fieldClassName = "rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30";
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
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Descoberta</p>
          <p className="mt-1 text-sm text-zinc-400">
            Filtre os eventos por termo, data, local e categoria.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Buscar</span>
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
          <span className="text-sm font-medium text-zinc-300">Data</span>
          <input
            className={fieldClassName}
            name="date"
            type="date"
            value={filters.date}
            onChange={(event) => onChange("date", event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Local</span>
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
          <span className="text-sm font-medium text-zinc-300">Categoria</span>
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
