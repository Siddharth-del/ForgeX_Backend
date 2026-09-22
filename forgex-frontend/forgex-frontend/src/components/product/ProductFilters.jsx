import { CATEGORIES, FRAGRANCE_FAMILIES, GENDERS } from '../../constants';

function Group({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="border-b border-line py-5 first:pt-0">
      <legend className="mb-3 text-[15px] font-semibold">{legend}</legend>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3 text-[15px]">
          <input type="radio" name={name} className="h-4 w-4 accent-ink" checked={!value} onChange={() => onChange('')} />
          All
        </label>
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-3 text-[15px]">
            <input type="radio" name={name} className="h-4 w-4 accent-ink" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ProductFilters({ filters, onChange }) {
  return (
    <div>
      <Group legend="Category" name="category" options={CATEGORIES} value={filters.category} onChange={(v) => onChange({ category: v })} />
      <Group legend="For" name="gender" options={GENDERS} value={filters.gender} onChange={(v) => onChange({ gender: v })} />
      <Group legend="Fragrance family" name="family" options={FRAGRANCE_FAMILIES} value={filters.family} onChange={(v) => onChange({ family: v })} />
    </div>
  );
}
