import type { FormEvent, KeyboardEvent, RefObject } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  username: string;
  password: string;
  loading: boolean;
  loginFormRef: RefObject<HTMLFormElement | null>;
  t: (key: string, fallback?: string) => string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function LoginView({
  username,
  password,
  loading,
  loginFormRef,
  t,
  onSubmit,
  onInputKeyDown,
  onUsernameChange,
  onPasswordChange,
}: Props) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-background p-4">
      {/* Vầng sáng brand xanh da trời cho nền bớt phẳng — thuần trang trí. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl"
      />
      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card/95 shadow-xl backdrop-blur-sm">
        <div className="h-2 bg-primary/80" />
        <CardHeader className="pb-4">
          <div className="mb-3 flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="DESI logo"
              className="h-12 w-12 rounded-xl border border-border bg-background object-contain p-1 shadow-xs"
            />
            <div>
              <p className="display-face text-xl font-semibold tracking-tight text-foreground">
                DESI CRM
              </p>
              <p className="text-xs text-muted-foreground">{t("app.login.subtitle")}</p>
            </div>
          </div>
          <CardTitle className="display-face text-xl text-foreground">
            {t("app.login.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form ref={loginFormRef} className="space-y-3" onSubmit={onSubmit}>
            <label htmlFor="login-username" className="sr-only">
              {t("app.login.usernamePlaceholder")}
            </label>
            <Input
              id="login-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("app.login.usernamePlaceholder")}
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <label htmlFor="login-password" className="sr-only">
              {t("app.login.passwordPlaceholder")}
            </label>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("app.login.passwordPlaceholder")}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
              type="submit"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? t("app.login.submitting") : t("app.login.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
