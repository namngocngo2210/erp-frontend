import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/hooks/use-auth-bootstrap";
import { fetchJson } from "@/services/http";

type Props = { onLoggedIn: (user: AuthUser) => void };

export function MobileLoginView({ onLoggedIn }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLoggedIn((data.user ?? data) as AuthUser);
    } catch {
      setError("Sai tài khoản hoặc mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.jpg" alt="DESI" className="h-14 w-14 rounded-xl object-contain" />
          <p className="text-lg font-semibold">DESI Nhân viên</p>
        </div>
        <Input
          placeholder="Tài khoản"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </div>
  );
}
