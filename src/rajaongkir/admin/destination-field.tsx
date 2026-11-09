import { useClient, type FieldProps } from "@njinlabs/njin-admin/sdk";
import { Combobox, type SelectOption } from "@njinlabs/njin-admin/ui";
import { useEffect, useRef, useState } from "react";

type Destination = { id: number; label: string };

// Draws only the input — the admin supplies the label and error. Stores the RajaOngkir
// destination id (a number); the readable label is written by the server into the sibling
// field named by `options.labelField` (see src/hooks/rajaongkir-label.ts).
export const DestinationField = ({ value, onChange, onBlur, disabled, values, options }: FieldProps) => {
  const client = useClient();
  const { labelField } = (options ?? {}) as { labelField?: string };

  const [results, setResults] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seq = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Labels of addresses picked in this session, by id. The label field in the form still holds
  // the old text until the record is saved, so a fresh pick is remembered here.
  const [known, setKnown] = useState<Record<number, string>>({});

  const id = typeof value === "number" && value > 0 ? value : null;
  const storedLabel = labelField ? values[labelField] : undefined;
  const label =
    (id !== null ? known[id] : undefined) ??
    (typeof storedLabel === "string" && storedLabel ? storedLabel : undefined);
  const current: SelectOption | null = id === null ? null : { value: String(id), label: label ?? `ID ${id}` };

  const search = (text: string) => {
    clearTimeout(timer.current);

    if (text.trim().length < 3) {
      setResults([]);
      return;
    }

    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      setLoading(true);
      try {
        const { data } = await client.get<{ data: Destination[] }>("/api/shipping/destinations", {
          params: { search: text.trim(), limit: 10 },
        });
        if (mine === seq.current) {
          setResults(data.data.map((d) => ({ value: String(d.id), label: d.label })));
        }
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 300);
  };

  return (
    <div onBlur={onBlur}>
      <Combobox
        options={results}
        value={current}
        onSearch={search}
        // Cleared -> 0, not undefined: the form drops undefined from the payload, so the old id
        // would be kept. 0 is the "not set" value (see src/vars/shipping.ts).
        onValueChange={(option) => {
          if (option) setKnown((prev) => ({ ...prev, [Number(option.value)]: option.label }));
          onChange(option ? Number(option.value) : 0);
        }}
        loading={loading}
        disabled={disabled}
        placeholder="Cari kelurahan / kecamatan / kota…"
      />
    </div>
  );
};
