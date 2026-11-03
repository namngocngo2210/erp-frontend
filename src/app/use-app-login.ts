import {
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
} from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { type AuthUser } from "@/hooks/use-auth-bootstrap";
import { handleApiError } from "@/lib/errors";
import { clearAuthTokens, fetchJson } from "@/services/http";

type UseAppLoginParams = {
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
};

/**
 * State + handler cho form đăng nhập (LoginView). Chỉ DI CHUYỂN từ App.tsx —
 * logic giữ nguyên. logout vẫn ở App vì còn phụ thuộc nhiều ref cache/domain.
 */
export function useAppLogin({ setUser }: UseAppLoginParams) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const loginFormRef = useRef<HTMLFormElement | null>(null);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = await fetchJson("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const userPayload = payload?.user ?? payload;
      setUser(userPayload);
      toast.success(t("auth.toast.loginSuccess"));
    } catch (err: unknown) {
      clearAuthTokens();
      // handleApiError ưu tiên detail của server (vd thông báo throttle 429 kèm
      // số giây chờ) thay vì luôn hiện "Đăng nhập thất bại" chung chung.
      handleApiError(err, { toast: t("auth.toast.loginFailed"), context: "auth.login" });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    loginFormRef.current?.requestSubmit();
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    loading,
    loginFormRef,
    login,
    handleLoginInputKeyDown,
  };
}
