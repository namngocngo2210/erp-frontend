import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "@/app/RequireAuth";

afterEach(cleanup);

/**
 * Dùng MemoryRouter + Routes (không phải createMemoryRouter): data router điều
 * hướng qua fetch Request nên `<Navigate>` vỡ trong jsdom
 * ("Expected signal to be an instance of AbortSignal") — 2 test redirect dưới
 * đây đỏ vì lý do môi trường chứ không phải vì hành vi sai.
 */
function renderAt(path: string, ui: React.ReactNode, routePath: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/login" element={<div>login screen</div>} />
        <Route path="/sales/orders" element={<div>orders fallback</div>} />
        <Route path={routePath} element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("redirects to /login when no user", () => {
    renderAt(
      "/secret",
      <RequireAuth user={null}>
        <div>secret</div>
      </RequireAuth>,
      "/secret",
    );
    expect(screen.getByText("login screen")).toBeInTheDocument();
  });

  it("renders children when user is authenticated", () => {
    renderAt(
      "/secret",
      <RequireAuth user={{ allowed_sections: ["orders"] }}>
        <div>secret</div>
      </RequireAuth>,
      "/secret",
    );
    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(screen.queryByText("login screen")).not.toBeInTheDocument();
  });

  it("redirects to / when section is not in allowed_sections", () => {
    renderAt(
      "/users",
      <RequireAuth user={{ allowed_sections: ["orders"] }} section="users">
        <div>users page</div>
      </RequireAuth>,
      "/users",
    );
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("users page")).not.toBeInTheDocument();
  });

  it("redirects to fallbackPath when provided", () => {
    renderAt(
      "/users",
      <RequireAuth
        user={{ allowed_sections: ["orders"] }}
        section="users"
        fallbackPath="/sales/orders"
      >
        <div>users page</div>
      </RequireAuth>,
      "/users",
    );
    expect(screen.getByText("orders fallback")).toBeInTheDocument();
  });

  it("renders children when section is in allowed_sections", () => {
    renderAt(
      "/orders",
      <RequireAuth user={{ allowed_sections: ["orders", "customers"] }} section="orders">
        <div>orders page</div>
      </RequireAuth>,
      "/orders",
    );
    expect(screen.getByText("orders page")).toBeInTheDocument();
  });
});
