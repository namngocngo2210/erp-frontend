import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAuthTokens, fetchJson, setAccessToken } from "../http";

// JWT giả với exp ở tương lai xa để shouldRefreshAccessToken() trả false.
function makeJwt(expSeconds: number): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64url({ alg: "HS256" })}.${b64url({ exp: expSeconds })}.sig`;
}

const FUTURE_TOKEN = makeJwt(Math.floor(Date.now() / 1000) + 3600);

type RecordedCall = { url: string; auth: string | null };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchJson auth bootstrap", () => {
  let calls: RecordedCall[];

  beforeEach(() => {
    clearAuthTokens();
    calls = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthTokens();
  });

  function installFetch(opts: { refreshSucceeds: boolean }) {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers ?? {});
      calls.push({ url, auth: headers.get("Authorization") });

      if (url.includes("/api/users/token/refresh")) {
        return opts.refreshSucceeds
          ? jsonResponse({ access: FUTURE_TOKEN }, 200)
          : jsonResponse({ detail: "Refresh token not provided." }, 401);
      }

      // Backend thật: thiếu Authorization => 401.
      if (!headers.get("Authorization")) {
        return jsonResponse({ detail: "unauthorized" }, 401);
      }
      return jsonResponse({ ok: true }, 200);
    }) as unknown as typeof fetch;
  }

  it("mints the access token via refresh BEFORE the first data request (no 401 burst)", async () => {
    installFetch({ refreshSucceeds: true });

    const data = await fetchJson("/api/orders/products?limit=10000&offset=0");

    expect(data).toEqual({ ok: true });

    const dataCalls = calls.filter((c) => c.url.includes("/api/orders/products"));
    // Cốt lõi: endpoint data chỉ được gọi ĐÚNG MỘT LẦN, và lần đó đã có token.
    // Trước fix: bị gọi 2 lần (lần đầu 401 trần trụi, lần sau retry mới có token).
    expect(dataCalls).toHaveLength(1);
    expect(dataCalls[0].auth).toBe(`Bearer ${FUTURE_TOKEN}`);

    const refreshCalls = calls.filter((c) => c.url.includes("/token/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("dedupes refresh across concurrent requests (single refresh for the whole burst)", async () => {
    installFetch({ refreshSucceeds: true });

    await Promise.all([
      fetchJson("/api/channels"),
      fetchJson("/api/orders/products"),
      fetchJson("/api/users/me"),
    ]);

    const refreshCalls = calls.filter((c) => c.url.includes("/token/refresh"));
    expect(refreshCalls).toHaveLength(1);

    // Không có request data nào bay ra mà thiếu Authorization.
    const tokenlessData = calls.filter((c) => !c.url.includes("/token/refresh") && c.auth === null);
    expect(tokenlessData).toHaveLength(0);
  });

  it("throws 401 when the refresh cookie is invalid (expired session)", async () => {
    installFetch({ refreshSucceeds: false });

    await expect(fetchJson("/api/users/me")).rejects.toMatchObject({ status: 401 });
  });

  it("skips proactive refresh when a valid token is already in memory", async () => {
    installFetch({ refreshSucceeds: true });
    setAccessToken(FUTURE_TOKEN);

    await fetchJson("/api/channels");

    const refreshCalls = calls.filter((c) => c.url.includes("/token/refresh"));
    expect(refreshCalls).toHaveLength(0);
  });
});

describe("thông báo 429 (rate limit)", () => {
  beforeEach(() => {
    clearAuthTokens();
    setAccessToken(FUTURE_TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthTokens();
  });

  function respondWith(response: Response) {
    globalThis.fetch = vi.fn(async () => response);
  }

  it("thay chuỗi tiếng Anh của DRF bằng thông báo tiếng Việt kèm số giây chờ", async () => {
    respondWith(
      new Response(
        JSON.stringify({ detail: "Request was throttled. Expected available in 42 seconds." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "42" } },
      ),
    );

    await expect(fetchJson("/api/orders")).rejects.toMatchObject({
      status: 429,
      message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau 42 giây.",
    });
  });

  it("đổi sang phút khi phải chờ lâu", async () => {
    respondWith(new Response("", { status: 429, headers: { "Retry-After": "150" } }));

    await expect(fetchJson("/api/orders")).rejects.toMatchObject({
      message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau 3 phút.",
    });
  });

  it("vẫn dễ hiểu khi nginx chặn ở edge (không có Retry-After, không có body JSON)", async () => {
    respondWith(new Response("<html>429</html>", { status: 429 }));

    await expect(fetchJson("/api/orders")).rejects.toMatchObject({
      message: "Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.",
    });
  });
});

describe("thông báo lỗi 400", () => {
  beforeEach(() => {
    clearAuthTokens();
    setAccessToken(FUTURE_TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthTokens();
  });

  it("nối detail dạng list (validate_password) thay vì trả 'HTTP 400'", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ detail: ["Mật khẩu này quá ngắn.", "Mật khẩu này quá phổ biến."] }, 400),
    );

    await expect(fetchJson("/api/users/admin/1", { method: "PATCH" })).rejects.toMatchObject({
      status: 400,
      message: "Mật khẩu này quá ngắn. Mật khẩu này quá phổ biến.",
    });
  });

  it("đọc error.detail khi lỗi serializer theo field", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(
        {
          confirm_password: ["Mật khẩu xác nhận không khớp."],
          error: { code: "validation_error", detail: "Mật khẩu xác nhận không khớp." },
        },
        400,
      ),
    );

    await expect(fetchJson("/api/users/change-password", { method: "POST" })).rejects.toMatchObject(
      {
        message: "Mật khẩu xác nhận không khớp.",
      },
    );
  });
});
