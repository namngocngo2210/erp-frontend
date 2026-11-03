// ui-check: chụp màn hình + đo overflow các trang chính ở nhiều độ rộng.
// Chạy trên bản build `dist/` với API mock (không cần backend/tài khoản thật).
// Xem README.md cùng thư mục để biết lệnh docker.
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { UNAUTH_PAGES, mockApi, seedAuthScript } from "./fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, "../..");
const DIST = path.resolve(process.env.DIST ?? path.join(FRONTEND, "dist"));
const LABEL = process.env.LABEL ?? "baseline";
const OUT = path.join(FRONTEND, ".ui-check", LABEL);
const WIDTHS = (process.env.WIDTHS ?? "375,768,1024,1280,1920").split(",").map(Number);
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 1200);
// >0: chụp thêm `<trang>_<w>_scrollx.png` sau khi cuộn ngang mọi vùng cuộn N px (kiểm cột sticky).
const SCROLL_X = Number(process.env.SCROLL_X ?? 0);
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/chromium";

const DEFAULT_PAGES = [
  "/login",
  "/apps",
  "/sales/orders",
  "/sales/orders/900001",
  "/crm/customers",
  "/sales/contacts",
  "/crm/loyal-customers",
  "/sales/resale-tracking",
  "/aftersales/warranty",
  "/catalog/products",
  "/inventory/stock",
  "/inventory/shipments",
  "/reports/dashboard",
  "/reports/overview-report",
  "/hr/employees",
  "/hr/compensation",
  "/settings/lead-assignment",
  "/settings/roles",
  "/settings/roles?role=1",
];
const PAGES = process.env.PAGES ? process.env.PAGES.split(",").map((p) => p.trim()) : DEFAULT_PAGES;

// puppeteer-core KHÔNG nằm trong package.json của frontend — lấy từ image ui-check (/app).
async function loadPuppeteer() {
  const base = process.env.PUPPETEER_BASE ?? "/app/package.json";
  const req = createRequire(base);
  const mod = await import(pathToFileURL(req.resolve("puppeteer-core")).href);
  return mod.default?.launch ? mod.default : mod;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

// Static server nhỏ: phục vụ dist/ + SPA fallback về index.html.
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(DIST, urlPath);
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
      file = path.join(DIST, "index.html");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Chạy trong trang: đo phần tử tràn viewport và phần tử bị cắt.
function measure() {
  const vw = document.documentElement.clientWidth;
  const describe = (el) => {
    const cls = (el.className?.baseVal ?? el.className ?? "").toString().trim().split(/\s+/);
    const id = el.id ? `#${el.id}` : "";
    const slot = el.getAttribute("data-slot");
    return {
      selector: `${el.tagName.toLowerCase()}${id}${slot ? `[data-slot=${slot}]` : ""}${cls[0] ? "." + cls.slice(0, 4).join(".") : ""}`,
      cls: cls.join(" ").slice(0, 160),
      text: (el.innerText ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
    };
  };
  // Vùng cuộn ngang hợp lệ (wrapper bảng, overflow-x-auto…). `overflow-y-auto` (vd <main>)
  // cũng làm overflowX tính ra "auto" nhưng không phải vùng cuộn ngang có chủ đích → bỏ qua.
  const legitScrollX = (p) => {
    const ox = getComputedStyle(p).overflowX;
    if (ox !== "auto" && ox !== "scroll") return false;
    const c = typeof p.className === "string" ? p.className : "";
    return !/(^|\s)overflow-y-(auto|scroll)(\s|$)/.test(c) || /overflow-x-(auto|scroll)/.test(c);
  };
  // Nằm trong vùng cuộn ngang hợp lệ (wrapper bảng…) vừa viewport → không phải lỗi.
  const inScrollX = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (legitScrollX(p) && p.getBoundingClientRect().right <= vw + 1) return true;
    }
    return false;
  };
  // Hình trang trí (blob nền): pointer-events-none và không có chữ.
  const decorative = (el) =>
    getComputedStyle(el).pointerEvents === "none" && !el.textContent.trim();
  // Con thật sự vượt mép ngang của container (lấy con vượt nhiều nhất, ngoài cùng).
  const worstOverflowChild = (box) => {
    const br = box.getBoundingClientRect();
    let worst = null;
    let worstPx = 1;
    for (const c of box.querySelectorAll("*")) {
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const px = Math.max(r.right - br.right, br.left - r.left);
      if (px <= worstPx || decorative(c) || inScrollX(c)) continue;
      worst = c;
      worstPx = px;
    }
    return worst;
  };
  const hidden = (el) => {
    const cs = getComputedStyle(el);
    return cs.visibility === "hidden" || Number(cs.opacity) === 0;
  };

  const overflow = [];
  const counted = new Set();
  let overflowTotal = 0;
  let offscreen = 0;
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    if (hidden(el) || decorative(el) || inScrollX(el)) continue;
    // Nằm hẳn ngoài viewport (drawer/menu ẩn bằng transform) → không tính là vỡ layout.
    if (r.left >= vw || r.right <= 0) {
      offscreen++;
      continue;
    }
    overflowTotal++;
    let nested = false;
    for (let p = el.parentElement; p; p = p.parentElement) if (counted.has(p)) nested = true;
    counted.add(el);
    if (nested) continue;
    overflow.push({
      ...describe(el),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
    });
  }

  // Phần tử cắt nội dung ngang (overflow hidden/clip mà scrollWidth > clientWidth), bỏ qua
  // truncate có chủ đích (text-overflow: ellipsis / line-clamp).
  const clipped = [];
  for (const el of [
    document.documentElement,
    document.body,
    ...document.querySelectorAll("body *"),
  ]) {
    const cs = getComputedStyle(el);
    if (cs.overflowX !== "hidden" && cs.overflowX !== "clip") continue;
    if (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none") continue;
    if (el.clientWidth < 40 || el.scrollWidth <= el.clientWidth + 1) continue;
    if (hidden(el)) continue;
    const child = worstOverflowChild(el);
    if (!child) continue;
    clipped.push({
      cause: describe(child),
      ...describe(el),
      hiddenPx: el.scrollWidth - el.clientWidth,
      width: el.clientWidth,
    });
  }
  // Thông tin (không phải lỗi): vùng cuộn ngang hợp lệ đang thực sự cuộn — bảng rộng
  // hơn khung, ứng viên cho sticky cột định danh / card view ở màn nhỏ.
  const scrollX = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!legitScrollX(el) || el.clientWidth < 40 || el.scrollWidth <= el.clientWidth + 1) continue;
    scrollX.push({ ...describe(el), contentW: el.scrollWidth, width: el.clientWidth });
  }
  clipped.sort((a, b) => b.hiddenPx - a.hiddenPx);
  overflow.sort((a, b) => b.right - a.right);

  // "Nội dung chính": phần chiều cao của vùng `[data-main-content]` (list/bảng chính)
  // nằm trong viewport / chiều cao viewport. null = trang chưa gắn attribute.
  const vh = window.innerHeight;
  let mainRatio = null;
  for (const el of document.querySelectorAll("[data-main-content]")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    mainRatio = Math.round((visible / vh) * 100) / 100;
    break;
  }

  const crashed = /Đã có lỗi xảy ra|Something went wrong/.test(document.body.innerText);
  return {
    vw,
    vh,
    mainRatio,
    crashed,
    crashDetail: crashed
      ? (document.querySelector("details")?.textContent ?? "").slice(0, 400)
      : undefined,
    url: location.pathname + location.search,
    docScrollW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    overflowTotal,
    overflowCount: overflow.length,
    offscreen,
    clippedCount: clipped.length,
    scrollX: scrollX.slice(0, 5),
    overflow: overflow.slice(0, 15),
    clipped: clipped.slice(0, 15),
  };
}

function slug(p) {
  return p.replace(/^\//, "").replace(/[/?&=]+/g, "_") || "root";
}

function renderMarkdown(rows, missing) {
  const pages = [...new Set(rows.map((r) => r.page))];
  const lines = [
    `# ui-check — ${LABEL}`,
    "",
    `Tạo lúc ${new Date().toISOString()}. Ô bảng: \`tràn/cắt/cuộn\` (tràn = phần tử ngoài cùng vượt viewport, ngoài vùng cuộn; cắt = container overflow hidden/clip giấu nội dung; cuộn = vùng cuộn ngang hợp lệ đang cuộn — thông tin, không phải lỗi).`,
    "",
    `| Trang | ${WIDTHS.join(" | ")} |`,
    `|---|${WIDTHS.map(() => "---").join("|")}|`,
  ];
  for (const p of pages) {
    const cells = WIDTHS.map((w) => {
      const r = rows.find((x) => x.page === p && x.width === w);
      if (!r) return "-";
      if (r.error) return "lỗi";
      return `${r.overflowCount}/${r.clippedCount}/${r.scrollX.length}${r.url !== p ? " ↪" : ""}${r.crashed ? " 💥" : ""}`;
    });
    lines.push(`| ${p} | ${cells.join(" | ")} |`);
  }
  lines.push(
    "",
    "↪ = trang đã redirect sang URL khác; 💥 = ErrorBoundary (fixture thiếu/sai).",
    "",
    "## Nội dung chính (`mainRatio`)",
    "",
    "Chiều cao hiển thị của `[data-main-content]` trong viewport / chiều cao viewport (— = trang chưa gắn).",
    "",
    `| Trang | ${WIDTHS.join(" | ")} |`,
    `|---|${WIDTHS.map(() => "---").join("|")}|`,
  );
  for (const p of pages) {
    const cells = WIDTHS.map((w) => {
      const r = rows.find((x) => x.page === p && x.width === w);
      return r?.mainRatio == null ? "—" : r.mainRatio.toFixed(2);
    });
    lines.push(`| ${p} | ${cells.join(" | ")} |`);
  }
  lines.push("", "## Chi tiết top 5 mỗi trang × độ rộng", "");
  for (const r of rows) {
    if (r.error || (!r.overflowCount && !r.clippedCount && !r.scrollX.length)) continue;
    lines.push(`### ${r.page} @ ${r.width}px (url ${r.url}, docScrollW ${r.docScrollW})`);
    for (const o of r.overflow.slice(0, 5)) {
      lines.push(
        `- tràn \`${o.selector}\` left ${o.left} right ${o.right} w ${o.width} — "${o.text}"`,
      );
    }
    for (const c of r.clipped.slice(0, 5)) {
      lines.push(
        `- cắt \`${c.selector}\` giấu ${c.hiddenPx}px (w ${c.width}) — do \`${c.cause.selector}\` "${c.cause.text}"`,
      );
    }
    for (const x of r.scrollX.slice(0, 3)) {
      lines.push(
        `- cuộn \`${x.selector}\` nội dung ${x.contentW}px / khung ${x.width}px — "${x.text}"`,
      );
    }
    lines.push("");
  }
  lines.push("## Endpoint chưa có fixture (fallback)", "");
  for (const m of [...missing].sort()) lines.push(`- \`${m}\``);
  return lines.join("\n") + "\n";
}

async function main() {
  if (!existsSync(path.join(DIST, "index.html")))
    throw new Error(`Không thấy ${DIST}/index.html — chạy vite build trước.`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  const missing = new Set();
  const rows = [];

  try {
    for (const p of PAGES) {
      const authed = !UNAUTH_PAGES.includes(p);
      for (const width of WIDTHS) {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e.message ?? e).slice(0, 300)));
        page.on("console", async (m) => {
          if (m.type() !== "error") return;
          const parts = await Promise.all(
            m
              .args()
              .map((a) =>
                a.evaluate((v) => (v instanceof Error ? v.stack : String(v))).catch(() => ""),
              ),
          );
          errors.push((parts.join(" ") || m.text()).slice(0, 600));
        });
        await page.setViewport({ width, height: width < 800 ? 812 : 900 });
        await page.evaluateOnNewDocument(seedAuthScript, authed);
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          const url = new URL(req.url());
          if (url.protocol === "data:" || url.protocol === "blob:") return req.continue();
          if (url.origin !== origin) return req.abort("blockedbyclient");
          if (!url.pathname.startsWith("/api/")) return req.continue();
          const res = mockApi({ method: req.method(), url, authed });
          if (res.missing) missing.add(`${req.method()} ${url.pathname}`);
          return req.respond({
            status: res.status ?? 200,
            contentType: "application/json",
            body: JSON.stringify(res.body ?? {}),
          });
        });

        const row = { page: p, width };
        try {
          await page.goto(origin + p, { waitUntil: "networkidle0", timeout: 45_000 });
          await new Promise((r) => setTimeout(r, SETTLE_MS));
          Object.assign(row, await page.evaluate(measure));
          const base = `${slug(p)}_${width}`;
          await page.screenshot({ path: path.join(OUT, `${base}.png`) });
          row.shot = `${base}.png`;
          if (SCROLL_X > 0) {
            const scrolled = await page.evaluate((dx) => {
              let n = 0;
              for (const el of document.querySelectorAll("*")) {
                const ox = getComputedStyle(el).overflowX;
                if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) {
                  el.scrollLeft = dx;
                  n += 1;
                }
              }
              return n;
            }, SCROLL_X);
            if (scrolled > 0) {
              await new Promise((r) => setTimeout(r, 200));
              await page.screenshot({ path: path.join(OUT, `${base}_scrollx.png`) });
            }
          }
          if (width === Math.min(...WIDTHS)) {
            // Khung app cao đúng 100dvh + cuộn trong <main> → fullPage chỉ ra 1 màn hình.
            // Nới khung cho ảnh full (đo overflow đã xong ở trên nên không ảnh hưởng số liệu).
            await page.addStyleTag({
              content:
                ".h-dvh{height:auto!important}.overflow-y-auto,.overflow-auto{overflow:visible!important}main{overflow:visible!important}",
            });
            await new Promise((r) => setTimeout(r, 300));
            await page.screenshot({ path: path.join(OUT, `${base}_full.png`), fullPage: true });
          }
        } catch (e) {
          row.error = String(e.message ?? e);
        }
        if (errors.length) row.pageErrors = errors.slice(0, 5);
        rows.push(row);
        console.log(
          `${p} @${width}: ${row.error ? "ERROR " + row.error : `tràn ${row.overflowCount} cắt ${row.clippedCount} main ${row.mainRatio ?? "—"} url ${row.url}`}`,
        );
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify({ label: LABEL, widths: WIDTHS, rows, missing: [...missing].sort() }, null, 2),
  );
  writeFileSync(path.join(OUT, "report.md"), renderMarkdown(rows, missing));
  console.log(`\nXong: ${OUT}/report.md — ${missing.size} endpoint chưa có fixture.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
