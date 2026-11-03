import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useOrderSearch } from "@/features/warranty-claims/queries";
import type { OrderSearchResult } from "@/features/warranty-claims/warranty-claim-types";

interface Props {
  value: OrderSearchResult | null;
  onChange: (order: OrderSearchResult) => void;
  disabled?: boolean;
}

function optionLabel(o: OrderSearchResult): string {
  const parts = [o.name || "(không tên)", o.phone].filter(Boolean);
  if (o.shipping_code) parts.push(`VĐ ${o.shipping_code}`);
  return parts.join(" · ");
}

export function OrderPicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isFetching } = useOrderSearch(debounced);
  const results = useMemo(() => data ?? [], [data]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-left text-sm focus:outline-hidden focus:ring-2 focus:ring-ring/50 disabled:opacity-60"
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value ? optionLabel(value) : "Tìm đơn theo SĐT / mã vận đơn..."}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b p-2">
            <input
              type="text"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập SĐT hoặc mã vận đơn..."
              className="h-8 w-full rounded border px-2 text-sm focus:outline-hidden"
            />
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-64 overflow-auto">
            {debounced.length < 2 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Nhập tối thiểu 2 ký tự để tìm.
              </div>
            ) : results.length === 0 && !isFetching ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy đơn.</div>
            ) : (
              results.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={cn(
                    "block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-accent",
                    value?.id === o.id && "bg-accent",
                  )}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                    setText("");
                  }}
                >
                  <div className="font-medium text-foreground">{optionLabel(o)}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.product} · {o.sku}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
