export type ContentSort = "uploaded_at" | "title" | "rating";
export type ContentFilters = {
  sourceIds: string[];
  contentTypeIds: string[];
  overallRatings: string[];
  productIds: string[];
  categoryIds: string[];
  channelIds: string[];
  adRatings: string[];
  uploadedFrom: string;
  uploadedTo: string;
  sort: ContentSort;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};
export { PAGE_SIZE_OPTIONS_WIDE as PAGE_SIZE_OPTIONS } from "@/lib/constants/pagination";
export const DEFAULT_FILTERS: ContentFilters = {
  sourceIds: [],
  contentTypeIds: [],
  overallRatings: [],
  productIds: [],
  categoryIds: [],
  channelIds: [],
  adRatings: [],
  uploadedFrom: "",
  uploadedTo: "",
  sort: "uploaded_at",
  order: "desc",
  page: 1,
  pageSize: 20,
};

type ListKey =
  | "sourceIds"
  | "contentTypeIds"
  | "overallRatings"
  | "productIds"
  | "categoryIds"
  | "channelIds"
  | "adRatings";
const LISTS: Array<[ListKey, string]> = [
  ["sourceIds", "source_id"],
  ["contentTypeIds", "content_type_id"],
  ["overallRatings", "overall_rating"],
  ["productIds", "product_id"],
  ["categoryIds", "category_id"],
  ["channelIds", "channel_id"],
  ["adRatings", "ad_rating"],
];

export function filtersToSearchParams(f: ContentFilters): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, param] of LISTS) {
    // ad_rating chỉ có tác dụng khi gửi kèm channel_id (tài liệu §3.4) — không gửi lẻ.
    if (key === "adRatings" && f.channelIds.length === 0) continue;
    for (const v of f[key]) sp.append(param, v);
  }
  if (f.uploadedFrom) sp.set("uploaded_from", f.uploadedFrom);
  if (f.uploadedTo) sp.set("uploaded_to", f.uploadedTo);
  if (f.sort !== DEFAULT_FILTERS.sort || f.order !== DEFAULT_FILTERS.order) {
    sp.set("sort", f.sort);
    sp.set("order", f.order);
  }
  if (f.page !== 1) sp.set("page", String(f.page));
  if (f.pageSize !== DEFAULT_FILTERS.pageSize) sp.set("page_size", String(f.pageSize));
  return sp;
}

export function filtersFromSearchParams(sp: URLSearchParams): ContentFilters {
  const f: ContentFilters = { ...DEFAULT_FILTERS };
  for (const [key, param] of LISTS) f[key] = sp.getAll(param);
  f.uploadedFrom = sp.get("uploaded_from") ?? "";
  f.uploadedTo = sp.get("uploaded_to") ?? "";
  const sort = sp.get("sort");
  if (sort === "uploaded_at" || sort === "title" || sort === "rating") f.sort = sort;
  f.order = sp.get("order") === "asc" ? "asc" : "desc";
  const page = Number(sp.get("page") ?? "1");
  f.page = Number.isInteger(page) && page > 0 ? page : 1;
  const size = Number(sp.get("page_size") ?? "20");
  f.pageSize = Number.isInteger(size) && size >= 1 && size <= 100 ? size : 20;
  return f;
}
