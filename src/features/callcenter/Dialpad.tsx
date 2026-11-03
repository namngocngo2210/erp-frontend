import { useState } from "react";
import { Delete, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;

/** Bàn phím gọi ra khi webphone rảnh (idle). */
export function Dialpad({ onDial }: { onDial: (phone: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const phone = value.trim();
    if (phone) onDial(phone);
  };
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d*#+]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Nhập số điện thoại"
          inputMode="tel"
          aria-label="Số điện thoại"
          className="text-center text-base tracking-wider"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setValue((v) => v.slice(0, -1))}
          disabled={!value}
          aria-label="Xóa số"
        >
          <Delete className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map((key) => (
          <Button
            key={key}
            variant="outline"
            className="h-10 text-base font-medium"
            onClick={() => setValue((v) => v + key)}
          >
            {key}
          </Button>
        ))}
      </div>
      <Button onClick={submit} disabled={!value.trim()} className="gap-2" aria-label="Gọi đi">
        <Phone className="h-4 w-4" />
        Gọi đi
      </Button>
    </div>
  );
}
