import { useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { useI18n } from "@/i18n";

import { mediaCan } from "../access";
import { AdEvaluationList } from "../components/AdEvaluationList";
import { ContentDetailSheet } from "../components/ContentDetailSheet";
import { ContentFilterBar } from "../components/ContentFilterBar";
import { ContentFormDialog } from "../components/ContentFormDialog";
import { ContentImportDialog } from "../components/ContentImportDialog";
import { ContentRowActions } from "../components/ContentRowActions";
import { ContentTable } from "../components/ContentTable";
import { ContentTagsDialog } from "../components/ContentTagsDialog";
import { MediaAccessGate } from "../components/MediaAccessGate";
import { VideoActions } from "../components/VideoActions";
import {
  PAGE_SIZE_OPTIONS,
  filtersFromSearchParams,
  filtersToSearchParams,
  type ContentFilters,
} from "../filters";
import { useAllTaxonomy, useContents } from "../queries";
import { useContentActions } from "../use-content-actions";

/** Trang "Thư viện nội dung": filter trên URL, bảng danh sách, drawer chi tiết
 * theo route con /media/contents/:contentId. Task 16 cắm tạo/sửa/nhân bản/xoá +
 * sửa tag; Task 17 cắm phần đánh giá ads (thêm/sửa/xoá) trong drawer. */
export default function MediaContentsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { contentId } = useParams<{ contentId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next: ContentFilters) => setSearchParams(filtersToSearchParams(next), { replace: true }),
    [setSearchParams],
  );
  const apiParams = useMemo(() => filtersToSearchParams(filters), [filters]);
  const { data, isLoading } = useContents(apiParams);
  const taxonomy = useAllTaxonomy();
  const selectedId = contentId ? Number(contentId) : null;
  const openDetail = (id: number) =>
    navigate({ pathname: `/media/contents/${id}`, search: searchParams.toString() });
  const closeDetail = () =>
    navigate({ pathname: "/media/contents", search: searchParams.toString() });

  const actions = useContentActions((deletedId) => {
    if (selectedId === deletedId) closeDetail();
  });

  return (
    <div className="space-y-4">
      <MediaAccessGate>
        {(me) => (
          <>
            <PageHeader
              title={t("topnav.tabs.mediaContents")}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={actions.exporting}
                    onClick={() => void actions.exportExcel(apiParams)}
                  >
                    {t("media.contents.export.button")}
                  </Button>
                  {mediaCan(me.role, "content.create") ? (
                    <>
                      <Button variant="outline" onClick={() => actions.setImportOpen(true)}>
                        {t("media.contents.import.button")}
                      </Button>
                      <Button onClick={() => actions.setCreateOpen(true)}>
                        {t("media.contents.add")}
                      </Button>
                    </>
                  ) : null}
                </div>
              }
            />
            <ContentFilterBar value={filters} onChange={setFilters} taxonomy={taxonomy} />
            {isLoading || !data ? (
              <LogoSpinner />
            ) : (
              <>
                <ContentTable
                  items={data.items}
                  publicBaseUrl={me.public_base_url}
                  onOpen={openDetail}
                  rowActions={(c) => (
                    <ContentRowActions
                      content={c}
                      role={me.role}
                      onDuplicate={actions.duplicate}
                      onDelete={actions.remove}
                    />
                  )}
                />
                <TablePagination
                  total={data.total}
                  page={filters.page}
                  pageSize={filters.pageSize}
                  onPageChange={(page) => setFilters({ ...filters, page })}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
                />
              </>
            )}
            <ContentDetailSheet
              contentId={selectedId}
              publicBaseUrl={me.public_base_url}
              role={me.role}
              taxonomy={taxonomy}
              siblingIds={data?.items.map((c) => c.id) ?? []}
              onNavigate={openDetail}
              onClose={closeDetail}
              actions={(c) => (
                <>
                  {mediaCan(me.role, "content.edit_upload") ? (
                    <Button variant="outline" size="sm" onClick={() => actions.setEditTarget(c)}>
                      {t("media.contents.action.editInfo")}
                    </Button>
                  ) : null}
                  {mediaCan(me.role, "content.edit_marketing") ? (
                    <Button variant="outline" size="sm" onClick={() => actions.setTagsTarget(c)}>
                      {t("media.contents.action.editTags")}
                    </Button>
                  ) : null}
                  <VideoActions content={c} role={me.role} />
                </>
              )}
              evaluationsSlot={(c) => <AdEvaluationList contentId={c.id} role={me.role} />}
            />
            {actions.importOpen ? (
              <ContentImportDialog
                open
                onOpenChange={actions.setImportOpen}
                onImport={actions.submitImport}
              />
            ) : null}
            {actions.createOpen ? (
              <ContentFormDialog
                key="create"
                open
                onOpenChange={actions.setCreateOpen}
                taxonomy={taxonomy}
                onSubmit={actions.submitCreate}
              />
            ) : null}
            {actions.editTarget ? (
              <ContentFormDialog
                key={`edit-${actions.editTarget.id}`}
                open
                onOpenChange={(open) => {
                  if (!open) actions.setEditTarget(null);
                }}
                initial={actions.editTarget}
                taxonomy={taxonomy}
                onSubmit={actions.submitEdit}
              />
            ) : null}
            {actions.tagsTarget ? (
              <ContentTagsDialog
                key={`tags-${actions.tagsTarget.id}`}
                open
                onOpenChange={(open) => {
                  if (!open) actions.setTagsTarget(null);
                }}
                content={actions.tagsTarget}
                taxonomy={taxonomy}
                onSubmit={actions.submitTags}
              />
            ) : null}
          </>
        )}
      </MediaAccessGate>
    </div>
  );
}
