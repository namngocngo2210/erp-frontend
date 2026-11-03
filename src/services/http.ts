// Access token is kept IN-MEMORY ONLY (never localStorage) so XSS cannot read it.
// The refresh token lives in an httpOnly cookie; on reload the first request 401s
// and fetchJson re-mints the access token via the refresh endpoint.
let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

function normalizeApiUrl(rawUrl: string): string {
  return rawUrl;
}

export function getAccessToken(): string {
  return accessToken ?? "";
}

export async function getValidAccessToken(): Promise<string> {
  let current = getAccessToken();
  if (!current) {
    const refreshed = await refreshTokenShared();
    if (!refreshed) return "";
    return getAccessToken();
  }

  if (shouldRefreshAccessToken(current)) {
    const refreshed = await refreshTokenShared();
    if (!refreshed) return "";
    current = getAccessToken();
  }

  return current;
}

export function setAccessToken(access: string) {
  accessToken = access || null;
}

export function clearAuthTokens() {
  accessToken = null;
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;

  const detail = typeof data.detail === "string" ? data.detail.trim() : "";
  if (detail) return detail;

  // Django validate_password trả list lỗi ({"detail": ["...", "..."]}).
  if (Array.isArray(data.detail)) {
    const joined = data.detail
      .filter((item): item is string => typeof item === "string" && item.trim() !== "")
      .join(" ");
    if (joined) return joined;
  }

  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (message) return message;

  // Lỗi serializer DRF ({"field": ["..."]}) — api_exception_handler gom thông báo
  // đầu tiên vào `error.detail`.
  const envelope = data.error;
  if (envelope && typeof envelope === "object") {
    const envelopeDetail = (envelope as Record<string, unknown>).detail;
    if (typeof envelopeDetail === "string" && envelopeDetail.trim()) return envelopeDetail.trim();
  }

  const errors = data.errors;
  if (Array.isArray(errors)) {
    const firstError = errors.find((item) => typeof item === "string");
    if (typeof firstError === "string" && firstError.trim()) return firstError.trim();
  }

  return "";
}

/**
 * Thông báo cho 429.
 *
 * DRF trả `detail` bằng TIẾNG ANH ("Request was throttled. Expected available in
 * 42 seconds.") và FE hiển thị thẳng `detail` cho người dùng — chuỗi đó lộ ra UI.
 * nginx thì chặn ở edge nên không có body JSON nào cả, chỉ có status 429.
 * Cả hai đường đều đi qua đây.
 *
 * Số giây lấy từ header `Retry-After` (DRF và nginx đều set) — nói rõ chờ bao lâu
 * để người dùng không bấm lại liên tục, càng bấm càng lâu được phục vụ.
 */
export function throttledMessage(response: Response): string {
  const retryAfter = Number(response.headers.get("Retry-After"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    const minutes = Math.ceil(retryAfter / 60);
    const waitText = retryAfter < 60 ? `${Math.ceil(retryAfter)} giây` : `${minutes} phút`;
    return `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${waitText}.`;
  }
  return "Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.";
}

async function buildHttpErrorMessage(response: Response): Promise<string> {
  if (response.status === 429) return throttledMessage(response);

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json();
      const extracted = extractErrorMessage(payload);
      if (extracted) return extracted;
    } catch {
      // ignore json parsing errors
    }
  }

  try {
    const text = (await response.text()).trim();
    if (text) return text;
  } catch {
    // ignore text parsing errors
  }

  return `HTTP ${response.status}`;
}

function isRefreshEndpoint(url: string): boolean {
  return url.startsWith("/api/users/token/refresh");
}

function isLoginEndpoint(url: string): boolean {
  return url.startsWith("/api/users/login");
}

function decodeBase64Url(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized);
}

function parseJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadRaw = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadRaw) as { exp?: unknown };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(token: string): boolean {
  const expMs = parseJwtExpMs(token);
  if (!expMs) return false;
  return Date.now() >= expMs - 30_000;
}

async function tryRefreshToken(): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch("/api/users/token/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  } catch {
    // Lỗi mạng tạm thời: KHÔNG xóa token để phiên sống sót qua blip, thử lại sau.
    return false;
  }

  if (!response.ok) {
    // Chỉ coi là hết phiên khi server từ chối auth thật sự (401/403). Lỗi 5xx
    // (vd DB quá tải "too many clients") là tạm thời → giữ token, thử lại sau.
    if (response.status === 401 || response.status === 403) {
      clearAuthTokens();
    }
    return false;
  }

  const data = await response.json();
  const nextAccess = typeof data?.access === "string" ? data.access : "";
  if (!nextAccess) {
    clearAuthTokens();
    return false;
  }

  setAccessToken(nextAccess);
  return true;
}

async function refreshTokenShared(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = tryRefreshToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function fetchBlob(url: string): Promise<Blob> {
  const accessToken = await getValidAccessToken();
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const res = await fetch(url, { credentials: "include", headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/**
 * Kiểu của `fetchJson` để truyền qua props/deps (orders data-layer). Trước đây 4
 * file tự khai `(url, options) => Promise<any>` kèm eslint-disable; gom về một
 * chỗ để khi `fetchJson` siết kiểu trả về thì các nơi nhận tự theo.
 */
export type FetchJson = typeof fetchJson;

export async function fetchJson(url: string, options?: RequestInit) {
  const normalizedUrl = normalizeApiUrl(url);
  const method = (options?.method ?? "GET").toUpperCase();
  const isAuthEndpoint = isRefreshEndpoint(normalizedUrl) || isLoginEndpoint(normalizedUrl);
  const isForm = options?.body instanceof FormData;

  const headers = new Headers(options?.headers ?? {});
  if (!isForm && !headers.has("Content-Type") && method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  let accessToken = getAccessToken();
  // Chủ động đảm bảo có token hợp lệ TRƯỚC khi gửi (mint qua cookie refresh nếu
  // đang rỗng — vd vừa reload, token in-memory mất). getValidAccessToken dedupe
  // refresh nên cả loạt request song song lúc boot chỉ refresh đúng 1 lần và đều
  // đi kèm Authorization → không còn "bức tường 401" trên màn console.
  if (!isAuthEndpoint) {
    accessToken = await getValidAccessToken();
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(normalizedUrl, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && !isAuthEndpoint) {
    const refreshed = await refreshTokenShared();
    if (refreshed) {
      const retryHeaders = new Headers(options?.headers ?? {});
      if (!isForm && !retryHeaders.has("Content-Type") && method !== "GET" && method !== "HEAD") {
        retryHeaders.set("Content-Type", "application/json");
      }
      const nextAccess = getAccessToken();
      if (nextAccess) {
        retryHeaders.set("Authorization", `Bearer ${nextAccess}`);
      }
      response = await fetch(normalizedUrl, {
        ...options,
        credentials: "include",
        headers: retryHeaders,
      });
    }
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.clone().json();
    } catch {
      // body không phải JSON — bỏ qua
    }
    const message = await buildHttpErrorMessage(response);
    const error = new Error(message || `HTTP ${response.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  if (response.status === 204) return null;

  const data = await response.json();
  const access = typeof data?.access === "string" ? data.access : "";
  if (access) {
    setAccessToken(access);
  }
  return data;
}
