import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { portalErrorMessage } from "../error-message";
import { normalizePhone } from "@/lib/phone";
import { activate } from "../portal-api";
import { PORTAL_COLOR, PORTAL_GRADIENT } from "../portal-theme";
import type { ActivateResponse } from "../types";

import { PortalScanButton } from "./PortalScanButton";

export function ActivateForm({ onSuccess }: { onSuccess: (data: ActivateResponse) => void }) {
  const [keyword, setKeyword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedKeyword = keyword.trim().toUpperCase();
    if (normalizedKeyword.length < 6) {
      setError("Vui lòng nhập mã in trên tem bảo hành.");
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const data = await activate({ keyword: normalizedKeyword, phone: normalizedPhone });
      onSuccess(data);
    } catch (err) {
      setError(portalErrorMessage(err, "activate"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-in fade-in w-full rounded-t-3xl bg-white px-5 pt-6 pb-8 shadow-sm duration-500 sm:rounded-3xl sm:px-6">
      <h1 className="text-lg font-semibold" style={{ color: PORTAL_COLOR.tealDeep }}>
        Kích hoạt bảo hành
      </h1>
      <p className="mt-1 text-sm" style={{ color: PORTAL_COLOR.grayText }}>
        Nhập mã 8 ký tự dưới lớp cào trên tem bảo hành sản phẩm.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="keyword" className="text-sm font-medium text-foreground">
            Mã bảo hành (8 ký tự)
          </label>
          <div className="flex gap-2">
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="A8K2M4P9QX"
              autoComplete="off"
              inputMode="text"
              autoCapitalize="characters"
              className="h-13 flex-1 font-mono text-lg uppercase tracking-[0.3em] placeholder:tracking-normal placeholder:text-muted-foreground/60"
            />
            <PortalScanButton
              disabled={pending}
              onDetected={(code) => {
                setKeyword(code);
                setError("");
              }}
            />
          </div>
          <p className="text-xs" style={{ color: PORTAL_COLOR.grayText }}>
            Mã nằm dưới lớp cào trên tem — cào nhẹ hoặc bấm biểu tượng camera để quét.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="activate_phone" className="text-sm font-medium text-foreground">
            Số điện thoại
          </label>
          <Input
            id="activate_phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại đăng ký bảo hành"
            inputMode="tel"
            className="h-13 text-base"
          />
          <p className="text-xs" style={{ color: PORTAL_COLOR.grayText }}>
            Vui lòng nhập đúng số điện thoại để được bảo hành, Delax sẽ bảo hành điện tử theo số
            điện thoại đăng ký của quý khách.
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium" style={{ color: PORTAL_COLOR.redAlert }}>
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          className="h-13 w-full border-0 text-base font-bold text-white shadow-md disabled:opacity-60"
          style={{ background: PORTAL_GRADIENT }}
        >
          {pending ? "Đang kiểm tra..." : "Kích hoạt bảo hành"}
        </Button>
      </form>
    </div>
  );
}
