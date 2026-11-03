import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

export type ScanShipmentInputHandle = { focus: () => void };

type Props = {
  onScan: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Mặc định true (desktop). Mobile tắt để bàn phím ảo không tự bật che màn hình. */
  autoFocusOnMount?: boolean;
};

export const ScanShipmentInput = forwardRef<ScanShipmentInputHandle, Props>(
  function ScanShipmentInput({ onScan, disabled, placeholder, autoFocusOnMount = true }, ref) {
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

    useEffect(() => {
      if (autoFocusOnMount) inputRef.current?.focus();
    }, [autoFocusOnMount]);

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const code = value.trim();
      setValue("");
      if (code) onScan(code);
      // keep capturing the next scan
      requestAnimationFrame(() => inputRef.current?.focus());
    }

    return (
      <Input
        ref={inputRef}
        value={value}
        disabled={disabled}
        autoFocus={autoFocusOnMount}
        placeholder={placeholder ?? "Quét mã vận đơn…"}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    );
  },
);
