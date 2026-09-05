/** Temakoron beluli valtas fulekkel – almenu helyett (TERV 6.3). */
export default function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="mb-5 flex gap-4 border-b"
      style={{ borderColor: "var(--border)" }}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="-mb-px border-b-2 bg-transparent px-1 pb-2 text-[13.5px]"
            style={{
              borderColor: active ? "var(--accent)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              fontWeight: active ? 500 : 400,
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
