import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Film, Play, X } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { MultiSelect } from "@/components/ui/multi-select";
import { PageHeader } from "@/components/ui/page-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { useI18n } from "@/i18n";
import type { MediaContent, MediaTaxonomyItem } from "@/lib/api/media";

import { AdEvaluationList } from "../components/AdEvaluationList";
import { ContentDetailSheet } from "../components/ContentDetailSheet";
import { ContentPlayer } from "../components/ContentPlayer";
import { Thumb } from "../components/ContentTable";
import { MediaAccessGate } from "../components/MediaAccessGate";
import { filtersFromSearchParams, filtersToSearchParams, type ContentFilters } from "../filters";
import { useAllTaxonomy, useContents } from "../queries";

/** 24 ô/lưới lấp vừa 3-4 cột màn desktop mà không tải quá nhiều thumbnail cùng lúc. */
const EXPLORE_PAGE_SIZE = 24;

/** Tên tham số URL giữ id content đang mở panel chi tiết — tách khỏi các param
 * lọc (`filters.ts` không biết và không đụng tới key này). */
const CONTENT_PARAM = "content";

const toOptions = (items: MediaTaxonomyItem[]) =>
  items.map((i) => ({ value: String(i.id), label: i.code ? `${i.code} – ${i.name}` : i.name }));

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-[10rem] flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * Ô lọc gọn cho lướt nhanh: chỉ nguồn/sản phẩm/khoảng ngày upload — khác
 * `ContentFilterBar` đầy đủ (rating/loại/kênh ads) của trang Thư viện nội dung.
 * Vẫn ghi vào URL qua `filtersToSearchParams` để giữ nguyên khả năng chia sẻ link lọc.
 */
function ExploreFilterBar({
  value,
  onChange,
  taxonomy,
}: {
  value: ContentFilters;
  onChange: (next: ContentFilters) => void;
  taxonomy: Record<string, MediaTaxonomyItem[]>;
}) {
  const { t } = useI18n();
  const set = <K extends keyof ContentFilters>(key: K, v: ContentFilters[K]) =>
    onChange({ ...value, [key]: v, page: 1 });
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <FilterField label={t("media.contents.filter.source")}>
        <MultiSelect
          options={toOptions(taxonomy["content-sources"] ?? [])}
          selected={value.sourceIds}
          onChange={(v) => set("sourceIds", v)}
          placeholder={t("media.contents.filter.source")}
          menuPortal
        />
      </FilterField>
      <FilterField label={t("media.contents.filter.product")}>
        <MultiSelect
          options={toOptions(taxonomy.products ?? [])}
          selected={value.productIds}
          onChange={(v) => set("productIds", v)}
          placeholder={t("media.contents.filter.product")}
          menuPortal
        />
      </FilterField>
      <FilterField label={t("media.contents.filter.from")}>
        <Input
          type="date"
          value={value.uploadedFrom}
          onChange={(e) => set("uploadedFrom", e.target.value)}
          className="h-9"
        />
      </FilterField>
      <FilterField label={t("media.contents.filter.to")}>
        <Input
          type="date"
          value={value.uploadedTo}
          onChange={(e) => set("uploadedTo", e.target.value)}
          className="h-9"
        />
      </FilterField>
    </div>
  );
}

/** Chấm tròn 20px chứa chữ cái đầu tên người tạo — thay ảnh đại diện thật (ads-crm
 * không trả avatar), tông emerald nhạt để không lấn màu rating (good/average/bad). */
function CreatorAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
      {initial}
    </span>
  );
}

/**
 * Một ô lưới kiểu ads-crm = 2 vùng bấm độc lập, KHÔNG lồng button trong button:
 * - Bấm thẻ ảnh 9:16 → phát video tại chỗ (thay thumbnail bằng `ContentPlayer`
 *   ngay trong ô, giữ nguyên khung 9:16 để lưới không nhảy). Tên hỗ trợ = tiêu
 *   đề content để test/đọc màn hình tìm đúng ô.
 * - Bấm tiêu đề HOẶC dòng người tạo → mở panel chi tiết bên phải (không phát video).
 */
function ExploreCell({
  content,
  publicBaseUrl,
  isPlaying,
  onPlay,
  onStop,
  onOpenDetail,
}: {
  content: MediaContent;
  publicBaseUrl: string;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onOpenDetail: () => void;
}) {
  const { t } = useI18n();
  // Không có creator (ads-crm chưa gắn) → hiện tên nguồn thay thế, không để trống dòng.
  const creatorName = content.creator?.name || content.source?.name || "—";
  return (
    <div className="flex flex-col gap-1.5">
      {isPlaying ? (
        <div className="relative flex aspect-[9/16] items-center justify-center overflow-hidden rounded-lg border bg-black">
          <ContentPlayer
            content={content}
            publicBaseUrl={publicBaseUrl}
            autoPlay
            className="w-full"
          />
          <button
            type="button"
            onClick={onStop}
            aria-label={t("media.explore.stop")}
            className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPlay}
          aria-label={content.title}
          className="group relative block aspect-[9/16] w-full overflow-hidden rounded-lg border bg-muted"
        >
          <Thumb
            content={content}
            publicBaseUrl={publicBaseUrl}
            className="h-full w-full rounded-none"
          />
          {/* Nút phát nổi giữa ảnh — hình tròn ~48px, đậm hơn khi hover. */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-[1px] transition group-hover:bg-black/55">
              <Play className="h-5 w-5 fill-white text-white" aria-hidden />
            </span>
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onOpenDetail}
        className="truncate text-left text-sm font-medium hover:underline"
      >
        {content.title}
      </button>
      <button type="button" onClick={onOpenDetail} className="flex items-center gap-1.5 text-left">
        <CreatorAvatar name={creatorName} />
        <span className="truncate text-sm text-muted-foreground">{creatorName}</span>
      </button>
    </div>
  );
}

/** Trang "Khám phá": lưới thumbnail lướt nhanh toàn bộ thư viện Media. Bấm ảnh
 * phát video ngay tại ô (chỉ 1 ô phát cùng lúc); bấm tên mở panel chi tiết
 * (Sheet phải, giữ danh sách phía sau) — id content mở panel nằm trên URL
 * (`content=<id>`) để refresh/back giữ đúng trạng thái. Filter cũng trên URL
 * (nguồn/sản phẩm/ngày). */
export default function MediaExplorePage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => {
    const f = filtersFromSearchParams(searchParams);
    // page_size mặc định của filtersFromSearchParams là 20 (trang Thư viện) — trang
    // Khám phá dùng lưới 24 ô trừ khi URL đã tự khai page_size khác.
    if (!searchParams.has("page_size")) f.pageSize = EXPLORE_PAGE_SIZE;
    return f;
  }, [searchParams]);
  const setFilters = useCallback(
    (next: ContentFilters) => setSearchParams(filtersToSearchParams(next), { replace: true }),
    [setSearchParams],
  );
  const apiParams = useMemo(() => filtersToSearchParams(filters), [filters]);
  const { data, isLoading } = useContents(apiParams);
  const taxonomy = useAllTaxonomy();

  // Chỉ 1 ô phát cùng lúc — bấm ảnh ô khác thì ô đang phát tự dừng.
  const [playingId, setPlayingId] = useState<number | null>(null);

  const openContentId = useMemo(() => {
    const raw = searchParams.get(CONTENT_PARAM);
    return raw ? Number(raw) : null;
  }, [searchParams]);

  // Mở/đóng panel chi tiết ghi thẳng vào URL với replace:false (khác setFilters
  // ở trên dùng replace:true) — để nút Back của trình duyệt đóng panel thay vì
  // rời trang, và không được đụng tới các param lọc/trang đang có.
  const openDetail = useCallback(
    (id: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(CONTENT_PARAM, String(id));
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );
  const closeDetail = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(CONTENT_PARAM);
        return next;
      },
      { replace: false },
    );
  }, [setSearchParams]);

  return (
    <div className="space-y-4">
      <MediaAccessGate>
        {(me) => (
          <>
            <PageHeader title={t("topnav.tabs.mediaExplore")} />
            <ExploreFilterBar value={filters} onChange={setFilters} taxonomy={taxonomy} />
            {isLoading || !data ? (
              <LogoSpinner />
            ) : data.items.length === 0 ? (
              <EmptyState icon={Film} title={t("media.common.empty")} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {data.items.map((c) => (
                    <ExploreCell
                      key={c.id}
                      content={c}
                      publicBaseUrl={me.public_base_url}
                      isPlaying={playingId === c.id}
                      onPlay={() => setPlayingId(c.id)}
                      onStop={() => setPlayingId(null)}
                      onOpenDetail={() => openDetail(c.id)}
                    />
                  ))}
                </div>
                <TablePagination
                  total={data.total}
                  page={filters.page}
                  pageSize={filters.pageSize}
                  onPageChange={(page) => setFilters({ ...filters, page })}
                />
              </>
            )}
            <ContentDetailSheet
              contentId={openContentId}
              publicBaseUrl={me.public_base_url}
              role={me.role}
              taxonomy={taxonomy}
              siblingIds={data?.items.map((c) => c.id) ?? []}
              onNavigate={openDetail}
              onClose={closeDetail}
              evaluationsSlot={(c) => <AdEvaluationList contentId={c.id} role={me.role} />}
            />
          </>
        )}
      </MediaAccessGate>
    </div>
  );
}
