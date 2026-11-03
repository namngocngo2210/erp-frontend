import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/i18n";
import type { MediaContent, MediaTaxonomyItem, TaxonomyGroup } from "@/lib/api/media";

import type { MediaRole } from "../access";
import { useContent } from "../queries";
import { ContentMarketingCard } from "./ContentMarketingCard";
import { ContentPlayer } from "./ContentPlayer";
import { ContentUploadCard } from "./ContentUploadCard";
import { RatingBadge } from "./RatingBadge";

type Props = {
  contentId: number | null;
  publicBaseUrl: string;
  role: MediaRole | null;
  taxonomy: Record<TaxonomyGroup, MediaTaxonomyItem[]>;
  onClose: () => void;
  /** id các nội dung của danh sách (bảng/lưới) đang mở panel — dùng cho ▲/▼. */
  siblingIds?: number[];
  onNavigate?: (id: number) => void;
  /** Nút hành động cắm vào hàng nút của card "Thông tin upload" (dialog sửa cũ của trang Thư viện). */
  actions?: (content: MediaContent) => ReactNode;
  /** Khối đánh giá ads — khi có, thay hẳn card đánh giá mặc định (AdEvaluationList sở hữu form + list). */
  evaluationsSlot?: (content: MediaContent) => ReactNode;
};

/**
 * Panel chi tiết 1 nội dung theo mẫu ads-crm: header có nút quay lại danh sách
 * + chuyển nội dung trước/sau (▲/▼) + mã/tên/rating + "Mở link", rồi 2 cột —
 * trái: xem trước + đánh giá ads; phải: tags + thông tin upload + marketing
 * (1 cột dưới `lg`). Mỗi card sửa tại chỗ theo role (`mediaCan`), không bắt
 * buộc phải mở dialog riêng như trước — dialog cũ (`ContentFormDialog`/
 * `ContentTagsDialog`) vẫn hoạt động song song qua `actions`.
 */
export function ContentDetailSheet({
  contentId,
  publicBaseUrl,
  role,
  taxonomy,
  onClose,
  siblingIds,
  onNavigate,
  actions,
  evaluationsSlot,
}: Props) {
  const { t } = useI18n();
  const { data: c, isLoading } = useContent(contentId);

  const siblingIndex = siblingIds && contentId != null ? siblingIds.indexOf(contentId) : -1;
  const prevId = siblingIndex > 0 ? siblingIds![siblingIndex - 1] : null;
  const nextId =
    siblingIds && siblingIndex >= 0 && siblingIndex < siblingIds.length - 1
      ? siblingIds[siblingIndex + 1]
      : null;

  return (
    <Sheet
      open={contentId != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="sm:max-w-xl lg:max-w-3xl xl:max-w-5xl">
        <SheetHeader className="gap-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="shrink-0 gap-1"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> {t("media.contents.detail.backToList")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={prevId == null}
              onClick={() => {
                if (prevId != null) onNavigate?.(prevId);
              }}
              aria-label={t("media.contents.detail.prev")}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={nextId == null}
              onClick={() => {
                if (nextId != null) onNavigate?.(nextId);
              }}
              aria-label={t("media.contents.detail.next")}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
            {c ? (
              <SheetTitle className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">#{c.id}</span>
                <span className="min-w-0 truncate">{c.title}</span>
                <RatingBadge rating={c.overall_rating} score={c.overall_score} />
              </SheetTitle>
            ) : (
              <SheetTitle className="min-w-0 flex-1 truncate">
                {t("media.contents.detail.title")}
              </SheetTitle>
            )}
            {c ? (
              <a href={c.url} target="_blank" rel="noreferrer" className="shrink-0">
                <Button type="button" variant="outline" size="sm" className="gap-1">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />{" "}
                  {t("media.contents.detail.openLink")}
                </Button>
              </a>
            ) : null}
          </div>
          {c ? (
            <SheetDescription>
              {c.source?.name ?? "—"} · {c.uploaded_at.slice(0, 10)}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <SheetBody>
          {isLoading || !c ? (
            <LogoSpinner />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("media.contents.detail.preview")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ContentPlayer
                      content={c}
                      publicBaseUrl={publicBaseUrl}
                      className="mx-auto w-full max-w-xs"
                    />
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs text-primary underline"
                    >
                      {c.url}
                    </a>
                  </CardContent>
                </Card>
                {evaluationsSlot ? (
                  evaluationsSlot(c)
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("media.contents.detail.evaluations")} ({(c.ad_evaluations ?? []).length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(c.ad_evaluations ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("media.contents.detail.noEvaluations")}
                        </p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {(c.ad_evaluations ?? []).map((e) => (
                            <li key={e.id} className="rounded border px-3 py-2">
                              <span className="font-medium tabular-nums">
                                {e.rating.toFixed(1)}
                              </span>{" "}
                              · {e.evaluator_name} · {e.evaluated_at.slice(0, 10)}
                              {e.note ? <p className="text-muted-foreground">{e.note}</p> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="space-y-4">
                {/* Belt and braces: ads-crm trả null cho slice rỗng (nil slice Go) —
                      media.ts đã chuẩn hoá về [], đây là lớp chặn thứ hai. */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("media.contents.detail.tags")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(c.products ?? []).length === 0 && (c.categories ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("media.contents.detail.noTags")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(c.products ?? []).map((p) => (
                          <Badge key={`p-${p.id}`} variant="secondary">
                            {p.code || p.name}
                          </Badge>
                        ))}
                        {(c.categories ?? []).map((k) => (
                          <Badge key={`k-${k.id}`} variant="secondary">
                            {k.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <ContentUploadCard
                  content={c}
                  role={role}
                  taxonomy={taxonomy}
                  actions={actions ? actions(c) : null}
                />
                <ContentMarketingCard content={c} role={role} taxonomy={taxonomy} />
              </div>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
