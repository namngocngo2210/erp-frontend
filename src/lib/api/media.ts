/**
 * Type theo tài liệu ads-crm "Tích hợp API đối ngoại" §4 + hàm gọi proxy /api/media/*.
 * Path mirror 1:1 với ads-crm (bỏ tiền tố /api/v1). Khi có docs/openapi.yaml của ads-crm,
 * thay phần type bằng openapi-typescript.
 */
// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 28 call fetchJson, migrate dần sang @/api/typed
import { fetchJson, getValidAccessToken } from "@/services/http";

export type MediaRole = "viewer" | "marketing" | "uploader" | "admin";
export type OverallRating = "good" | "average" | "bad" | "unknown";
export type JobStatus = "idle" | "pending" | "success" | "failed";
export type ProposalStatus = "pending" | "in_progress" | "done" | "cancelled";
export type TaxonomyGroup =
  | "content-types"
  | "products"
  | "product-categories"
  | "ad-channels"
  | "content-sources";
export const TAXONOMY_GROUPS: readonly TaxonomyGroup[] = [
  "content-types",
  "products",
  "product-categories",
  "ad-channels",
  "content-sources",
];

export type Paginated<T> = { items: T[]; total: number; page: number; page_size: number };
export type Listed<T> = { items: T[] };

export type MediaRemoteUser = {
  id: number;
  name: string;
  username: string;
  email?: string;
  role?: MediaRole;
  status?: string;
};
export type MediaTaxonomyItem = {
  id: number;
  name: string;
  is_active: boolean;
  group?: "video" | "image";
  code?: string;
  created_at?: string;
  updated_at?: string;
};
export type MediaAdEvaluation = {
  id: number;
  content_id: number;
  channel_id: number | null;
  channel: MediaTaxonomyItem | null;
  evaluator_id: number;
  evaluator_name: string;
  rating: number;
  note: string;
  evaluated_at: string;
  created_at: string;
  updated_at: string;
};
export type MediaContent = {
  id: number;
  content_code: string;
  uploaded_at: string;
  title: string;
  url: string;
  thumbnail_url: string;
  thumbnail_ext: string | null;
  video_status: JobStatus;
  video_ext: string | null;
  video_size: number | null;
  video_cached_at: string | null;
  source_id: number;
  source: MediaTaxonomyItem | null;
  content_type_id: number | null;
  content_type: MediaTaxonomyItem | null;
  overall_rating: OverallRating;
  overall_score: number | null;
  overall_note: string;
  products: MediaTaxonomyItem[];
  categories: MediaTaxonomyItem[];
  ad_evaluations: MediaAdEvaluation[];
  created_by: number;
  creator: MediaRemoteUser | null;
  updated_by: number;
  created_at: string;
  updated_at: string;
};
export type MediaProposal = {
  id: number;
  main_key: string;
  idea: string;
  due_date: string | null;
  status: ProposalStatus;
  product_id: number | null;
  product: MediaTaxonomyItem | null;
  content_id: number | null;
  content: MediaContent | null;
  created_by: number;
  creator: MediaRemoteUser | null;
  created_at: string;
  updated_at: string;
};
export type MediaMe = {
  provisioned: boolean;
  mode: "personal" | "shared" | null;
  role: MediaRole | null;
  remote_user: { id: number; username: string; name: string } | null;
  public_base_url: string;
  connection_ok: boolean;
};
export type MediaReportOverview = {
  total_contents: number;
  missing_tags: number;
  missing_evaluations: number;
  content_by_type: { name: string; total: number }[];
};
export type MediaRatingsByChannel = {
  items: { channel: string; avg_rating: number; total: number }[];
};
export type MediaQualityRow = { id: number; content_code: string; title: string; issue: string };
export type MediaContentQuality = {
  missing_tags: MediaQualityRow[];
  missing_evaluations: MediaQualityRow[];
};
export type MediaSettings = {
  base_url: string;
  shared_api_key_set: boolean;
  shared_api_key_prefix: string;
  is_active: boolean;
  last_check_at: string | null;
  last_check_ok: boolean | null;
  last_check_error: string;
  shared_key_role: string;
  shared_key_username: string;
};
export type MediaSettingsTest = {
  ok: boolean;
  role?: string;
  username?: string;
  warning?: string;
  error?: string;
};
/** `mode: "redirect"` → url là link R2 ký sẵn (~15 phút), phát thẳng. `"proxy"` →
 * ads-crm tự stream, url null — frontend rơi về nhúng nguồn gốc (Task Khám phá). */
export type MediaVideoUrl = { url: string | null; mode: "redirect" | "proxy" };

export type ContentUploadPayload = {
  uploaded_at: string;
  title: string;
  url: string;
  source_id: number;
  content_type_id?: number | null;
  product_ids?: number[];
  category_ids?: number[];
};
export type ContentTagsPayload = {
  content_type_id: number | null;
  product_ids: number[];
  category_ids: number[];
};
/** Kết quả import Excel: dòng hợp lệ đã tạo, dòng lỗi trả về kèm số dòng trong file. */
export type MediaImportRowError = { row: number; title: string; message: string };
export type MediaImportResult = {
  total_rows: number;
  created: number;
  created_ids: number[];
  errors: MediaImportRowError[];
};
export type EvaluationPayload = { rating: number; note: string };
export type ProposalPayload = {
  main_key: string;
  idea: string;
  due_date: string | null;
  status?: ProposalStatus;
  product_id: number | null;
  content_id: number | null;
};
export type TaxonomyPayload = {
  name?: string;
  code?: string;
  group?: "video" | "image";
  is_active?: boolean;
};

const BASE = "/api/media";
const q = (sp?: URLSearchParams) => (sp && sp.toString() ? `?${sp}` : "");
const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

/**
 * ads-crm viết bằng Go, encode slice nil thành `null` trong JSON (không phải
 * `[]`) — một nội dung chưa gắn tag / chưa được đánh giá quảng cáo trả về
 * `products`/`categories`/`ad_evaluations`: null. Kiểu `MediaContent` khai
 * mảng non-nullable để phần còn lại của app không phải xử lý null ở mọi nơi
 * dùng `.map()`; chuẩn hoá ngay ở đây (biên gọi API) là nơi duy nhất biết về
 * cái "tật" của ads-crm — nếu không, `.map()` thẳng lên null làm trắng cả
 * trang (đã xảy ra trên prod).
 */
type RawMediaContent = Omit<MediaContent, "products" | "categories" | "ad_evaluations"> & {
  products: MediaTaxonomyItem[] | null | undefined;
  categories: MediaTaxonomyItem[] | null | undefined;
  ad_evaluations: MediaAdEvaluation[] | null | undefined;
};
function normalizeContent(raw: RawMediaContent): MediaContent {
  return {
    ...raw,
    products: raw.products ?? [],
    categories: raw.categories ?? [],
    ad_evaluations: raw.ad_evaluations ?? [],
  };
}
function normalizeItems<T>(items: T[] | null | undefined): T[] {
  return items ?? [];
}

export const getMediaMe = (signal?: AbortSignal) =>
  fetchJson(`${BASE}/me`, { signal }) as Promise<MediaMe>;
export const listContents = async (sp: URLSearchParams, signal?: AbortSignal) => {
  const res = (await fetchJson(`${BASE}/contents${q(sp)}`, {
    signal,
  })) as Paginated<RawMediaContent> & { items: RawMediaContent[] | null };
  return {
    ...res,
    items: normalizeItems(res.items).map(normalizeContent),
  } as Paginated<MediaContent>;
};
export const getContent = async (id: number, signal?: AbortSignal) => {
  const res = (await fetchJson(`${BASE}/contents/${id}`, { signal })) as RawMediaContent;
  return normalizeContent(res);
};
export const createContent = async (p: ContentUploadPayload) =>
  normalizeContent((await fetchJson(`${BASE}/contents`, json("POST", p))) as RawMediaContent);
export const duplicateContent = async (id: number) =>
  normalizeContent(
    (await fetchJson(`${BASE}/contents/${id}/duplicate`, { method: "POST" })) as RawMediaContent,
  );
export const updateUploadInfo = async (id: number, p: ContentUploadPayload) =>
  normalizeContent(
    (await fetchJson(`${BASE}/contents/${id}/upload-info`, json("PATCH", p))) as RawMediaContent,
  );
export const updateMarketingInfo = async (id: number, p: ContentTagsPayload) =>
  normalizeContent(
    (await fetchJson(`${BASE}/contents/${id}/marketing-info`, json("PATCH", p))) as RawMediaContent,
  );
export const deleteContent = (id: number) =>
  fetchJson(`${BASE}/contents/${id}`, { method: "DELETE" }) as Promise<{ ok: true }>;
export const requestVideoCache = (id: number, force: boolean) =>
  fetchJson(`${BASE}/contents/${id}/video/cache${force ? "?force=1" : ""}`, {
    method: "POST",
  }) as Promise<{ video_status: JobStatus }>;
/** Luồng video same-origin qua chính ERP — ContentPlayer dùng nguồn này làm
 * đường phát chính (trình duyệt của người xem không tới được thẳng R2, xem
 * docblock ContentPlayer.tsx). <video> không gắn Authorization được nên phải
 * `fetch` URL này kèm Bearer rồi phát qua Blob, xem `downloadContentVideo`. */
export const contentVideoStreamUrl = (id: number) => `${BASE}/contents/${id}/video-stream`;

/** Import hàng loạt: gửi 1 file .xlsx, backend tạo từng nội dung trên ads-crm. */
export const importContentsExcel = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return fetchJson(`${BASE}/contents/import`, {
    method: "POST",
    body: form,
  }) as Promise<MediaImportResult>;
};

/** Tải file nhị phân của Media kèm Bearer rồi lưu xuống máy. Dùng `fetch` trần
 * (như `downloadContentVideo`) thay vì `fetchBlob` của services/http để module
 * này giữ nguyên bề mặt phụ thuộc — mọi test đang mock @/services/http chỉ với
 * `fetchJson` + `getValidAccessToken`. */
async function downloadFile(path: string, filename: string) {
  const token = await getValidAccessToken();
  const res = await fetch(path, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let detail = `Tải file thất bại (${res.status}).`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* body không phải JSON */
    }
    throw new Error(detail);
  }
  return saveBlob(await res.blob(), filename);
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export const downloadContentsImportTemplate = () =>
  downloadFile(`${BASE}/contents/import-template`, "mau-import-noi-dung.xlsx");

/** Xuất danh sách nội dung theo đúng bộ lọc đang xem (`sp` = query của trang). */
export const downloadContentsExcel = (sp: URLSearchParams) =>
  downloadFile(
    `${BASE}/contents/export${q(sp)}`,
    `noi-dung-media-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );

export const listEvaluations = async (contentId: number, signal?: AbortSignal) => {
  const res = (await fetchJson(`${BASE}/contents/${contentId}/ad-evaluations`, {
    signal,
  })) as Listed<MediaAdEvaluation> & { items: MediaAdEvaluation[] | null };
  return { items: normalizeItems(res.items) };
};
export const createEvaluation = (contentId: number, p: EvaluationPayload) =>
  fetchJson(
    `${BASE}/contents/${contentId}/ad-evaluations`,
    json("POST", p),
  ) as Promise<MediaAdEvaluation>;
export const updateEvaluation = (id: number, p: EvaluationPayload) =>
  fetchJson(`${BASE}/ad-evaluations/${id}`, json("PATCH", p)) as Promise<MediaAdEvaluation>;
export const deleteEvaluation = (id: number) =>
  fetchJson(`${BASE}/ad-evaluations/${id}`, { method: "DELETE" }) as Promise<{ ok: true }>;

export const listTaxonomy = async (
  group: TaxonomyGroup,
  includeInactive: boolean,
  signal?: AbortSignal,
) => {
  const res = (await fetchJson(
    `${BASE}/${group}${includeInactive ? "?include_inactive=true" : ""}`,
    { signal },
  )) as Listed<MediaTaxonomyItem> & { items: MediaTaxonomyItem[] | null };
  return { items: normalizeItems(res.items) };
};
export const createTaxonomy = (group: TaxonomyGroup, p: TaxonomyPayload) =>
  fetchJson(`${BASE}/${group}`, json("POST", p)) as Promise<MediaTaxonomyItem>;
export const updateTaxonomy = (group: TaxonomyGroup, id: number, p: TaxonomyPayload) =>
  fetchJson(`${BASE}/${group}/${id}`, json("PATCH", p)) as Promise<MediaTaxonomyItem>;
export const deleteTaxonomy = (group: TaxonomyGroup, id: number) =>
  fetchJson(`${BASE}/${group}/${id}`, { method: "DELETE" }) as Promise<{ ok: true }>;

export const listProposals = async (sp: URLSearchParams, signal?: AbortSignal) => {
  const res = (await fetchJson(`${BASE}/proposals${q(sp)}`, { signal })) as Paginated<
    Omit<MediaProposal, "content"> & { content: RawMediaContent | null }
  > & {
    items: (Omit<MediaProposal, "content"> & { content: RawMediaContent | null })[] | null;
  };
  return {
    ...res,
    items: normalizeItems(res.items).map((it) => ({
      ...it,
      content: it.content ? normalizeContent(it.content) : null,
    })),
  } as Paginated<MediaProposal>;
};
export const createProposal = (p: ProposalPayload) =>
  fetchJson(`${BASE}/proposals`, json("POST", p)) as Promise<MediaProposal>;
export const updateProposal = (id: number, p: ProposalPayload) =>
  fetchJson(`${BASE}/proposals/${id}`, json("PATCH", p)) as Promise<MediaProposal>;
export const deleteProposal = (id: number) =>
  fetchJson(`${BASE}/proposals/${id}`, { method: "DELETE" }) as Promise<{ ok: true }>;

// Cùng bệnh: ba endpoint report cũng trả mảng null khi rỗng (nil slice Go) —
// ratings-by-channel trả items: null luôn khi chưa có đánh giá nào gắn kênh;
// overview/content-quality trả null cho các mảng khi khoảng ngày chọn không
// có dữ liệu. ReportTables/ReportKpiRow .length/.map thẳng lên đó nên trắng
// trang Báo cáo — chuẩn hoá ở đây như các hàm content ở trên.
export const getReportOverview = async (sp: URLSearchParams, signal?: AbortSignal) => {
  const res = (await fetchJson(`${BASE}/reports/overview${q(sp)}`, { signal })) as Omit<
    MediaReportOverview,
    "content_by_type"
  > & {
    content_by_type: MediaReportOverview["content_by_type"] | null;
  };
  return { ...res, content_by_type: normalizeItems(res.content_by_type) };
};
export const getRatingsByChannel = async (sp: URLSearchParams, signal?: AbortSignal) => {
  const res = (await fetchJson(`${BASE}/reports/ratings-by-channel${q(sp)}`, {
    signal,
  })) as MediaRatingsByChannel & {
    items: MediaRatingsByChannel["items"] | null;
  };
  return { items: normalizeItems(res.items) };
};
export const getContentQuality = async (sp: URLSearchParams, signal?: AbortSignal) => {
  const res = (await fetchJson(`${BASE}/reports/content-quality${q(sp)}`, { signal })) as {
    missing_tags: MediaQualityRow[] | null;
    missing_evaluations: MediaQualityRow[] | null;
  };
  return {
    missing_tags: normalizeItems(res.missing_tags),
    missing_evaluations: normalizeItems(res.missing_evaluations),
  };
};

export const getMediaSettings = (signal?: AbortSignal) =>
  fetchJson(`${BASE}/settings`, { signal }) as Promise<MediaSettings>;
export const updateMediaSettings = (p: {
  base_url?: string;
  shared_api_key?: string | null;
  is_active?: boolean;
}) => fetchJson(`${BASE}/settings`, json("PATCH", p)) as Promise<MediaSettings>;
export const testMediaSettings = () =>
  fetchJson(`${BASE}/settings/test`, { method: "POST" }) as Promise<MediaSettingsTest>;

/** Thumbnail công khai trên host ads-crm (spec D8) — hotlink, không qua proxy. */
export function thumbnailUrl(
  publicBaseUrl: string,
  content: Pick<MediaContent, "id" | "thumbnail_ext">,
): string | null {
  if (!publicBaseUrl || !content.thumbnail_ext) return null;
  return `${publicBaseUrl.replace(/\/$/, "")}/api/v1/contents/${content.id}/thumbnail`;
}

/** Tải video qua proxy: fetch có Bearer → Blob (spec D9). Ném Error(detail) khi lỗi. */
export async function downloadContentVideo(id: number): Promise<{ blob: Blob; filename: string }> {
  const token = await getValidAccessToken();
  const res = await fetch(`${BASE}/contents/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let detail = `Tải video thất bại (${res.status}).`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* body không phải JSON */
    }
    throw new Error(detail);
  }
  const cd = res.headers.get("Content-Disposition") ?? "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(cd);
  const filename = m ? decodeURIComponent(m[1]) : `media-${id}.mp4`;
  return { blob: await res.blob(), filename };
}
