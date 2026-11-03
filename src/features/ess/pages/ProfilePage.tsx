import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyProfile } from "@/features/ess/queries";
import { clearAuthTokens, fetchJson, setAccessToken } from "@/services/http";
import { getApiErrorMessage, swallowError } from "@/lib/errors";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "--"}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { data: p } = useMyProfile();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetchJson("/api/users/change-password", {
        method: "POST",
        // Thiếu confirm_password thì ChangePasswordSerializer trả 400 ngay.
        body: JSON.stringify({
          current_password: cur,
          new_password: next,
          confirm_password: confirm,
        }),
      });
      if (res?.access) setAccessToken(res.access);
      setMsg("Đổi mật khẩu thành công.");
      setCur("");
      setNext("");
      setConfirm("");
    } catch (err: unknown) {
      setMsg(getApiErrorMessage(err, "Đổi mật khẩu thất bại. Vui lòng thử lại."));
    }
  };

  const logout = async () => {
    try {
      await fetchJson("/api/users/logout", { method: "POST" });
    } catch (err) {
      // ignore
      swallowError(err, "auth.logout");
    }
    clearAuthTokens();
    window.location.assign("/m");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Thông tin cá nhân</h1>
      <div className="rounded-lg border border-border bg-card px-3 py-2">
        <Row label="Họ tên" value={p?.full_name ?? ""} />
        <Row label="Mã NV" value={p?.employee_code ?? ""} />
        <Row label="Phòng ban" value={p?.department_name ?? ""} />
        <Row label="Chức danh" value={p?.job_title_display ?? ""} />
        <Row label="Quản lý" value={p?.manager_name ?? ""} />
        <Row label="Trạng thái" value={p?.employment_status_display ?? ""} />
        <Row label="Ngày vào làm" value={p?.hire_date ?? ""} />
        <Row label="SĐT" value={p?.phone ?? ""} />
      </div>

      <form
        onSubmit={changePassword}
        className="space-y-2 rounded-lg border border-border bg-card p-3"
      >
        <p className="text-sm font-medium">Đổi mật khẩu</p>
        <Input
          type="password"
          placeholder="Mật khẩu hiện tại"
          value={cur}
          onChange={(e) => setCur(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Mật khẩu mới"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Xác nhận mật khẩu mới"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Tối thiểu 12 ký tự, không chỉ gồm số.</p>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        <Button type="submit" className="h-11 w-full" disabled={!cur || !next || !confirm}>
          Cập nhật
        </Button>
      </form>

      <Button variant="outline" className="h-11 w-full" onClick={logout}>
        Đăng xuất
      </Button>
    </div>
  );
}
