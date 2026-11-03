import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { EyeOff, KeyRound, Pencil, Plus, Shield, ShieldCheck, TriangleAlert } from "lucide-react";

import {
  useOrderFieldCatalogQuery,
  usePermissionsQuery,
  useRolesQuery,
} from "@/features/roles/queries";
import { RoleCreateDialog, RoleDeleteDialog } from "@/features/roles/components/RoleDialogs";
import { RoleDetailHeader } from "@/features/roles/components/RoleDetailHeader";
import { RoleFieldGrantsPanel } from "@/features/roles/components/RoleFieldGrantsPanel";
import { RoleFieldRulesPanel } from "@/features/roles/components/RoleFieldRulesPanel";
import { RoleListSidebar } from "@/features/roles/components/RoleListSidebar";
import { RoleMobileActionBar } from "@/features/roles/components/RoleMobileActionBar";
import { RolePermissionsPanel } from "@/features/roles/components/RolePermissionsPanel";
import {
  buildSectionMap,
  groupSectionsByModule,
  sortAndFilterRoles,
} from "@/features/roles/role-draft";
import { useRoleEditor } from "@/features/roles/use-role-editor";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { TABLE_VIEWPORT_QUERY } from "@/lib/constants/layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Tabs, type TabItem } from "@/components/ui/tabs";

/** `?role=<id>` → id hợp lệ (số nguyên dương) hoặc null. */
function parseRoleId(raw: string | null): number | null {
  const id = Number(raw);
  return raw && Number.isInteger(id) && id > 0 ? id : null;
}

/** Đánh dấu entry lịch sử do chọn role từ danh sách → "‹ Vai trò" dùng history back. */
type RoleNavState = { roleFromList?: boolean } | null;

export default function RolesPage() {
  const rolesQuery = useRolesQuery();
  const permsQuery = usePermissionsQuery();
  const fieldCatalogQuery = useOrderFieldCatalogQuery();
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const perms = useMemo(() => permsQuery.data ?? [], [permsQuery.data]);
  const fieldCatalogGroups = useMemo(
    () => fieldCatalogQuery.data?.groups ?? [],
    [fieldCatalogQuery.data],
  );
  // Dưới lg: master→detail (list HOẶC chi tiết full màn); từ lg: 2 cột như cũ.
  const isDesktop = useMediaQuery(TABLE_VIEWPORT_QUERY);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Role đang chọn nằm trên URL (`?role=<id>`) để back của trình duyệt/điện thoại
  // quay về danh sách và link chia sẻ mở thẳng chi tiết.
  const selectedId = parseRoleId(searchParams.get("role"));
  const setSelectedId = useCallback(
    (id: number | null, { replace = false }: { replace?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id == null) next.delete("role");
          else next.set("role", String(id));
          return next;
        },
        { replace, state: id != null && !replace ? { roleFromList: true } : null },
      );
    },
    [setSearchParams],
  );
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const selected = useMemo(
    () => roles.find((r) => r.id === selectedId) ?? null,
    [roles, selectedId],
  );

  // Role đang chọn bị xoá (bởi mình hoặc người khác) → bỏ chọn sau khi
  // list refetch, thay cho phần dọn selectedId trong refresh() cũ.
  const rolesData = rolesQuery.data;
  useEffect(() => {
    if (!rolesData) return;
    if (selectedId != null && !rolesData.some((role) => role.id === selectedId)) {
      setSelectedId(null, { replace: true });
    }
  }, [rolesData, selectedId, setSelectedId]);

  const editor = useRoleEditor(selectedId, selected);
  const { draftCodes, draftFieldRules, draftFieldGrants, readOnly } = editor;
  const confirmDiscard = useUnsavedGuard(editor.isDirty && !readOnly);

  // Đổi role / quay lại danh sách khi còn thay đổi chưa lưu → hỏi trước khi bỏ bản nháp.
  async function handleSelect(id: number) {
    if (id === selectedId) return;
    if (!(await confirmDiscard())) return;
    setSelectedId(id);
  }

  async function handleBack() {
    if (!(await confirmDiscard())) return;
    // Vào chi tiết từ danh sách → back lịch sử (không đẻ thêm entry); mở thẳng link → replace.
    if ((location.state as RoleNavState)?.roleFromList) navigate(-1);
    else setSelectedId(null, { replace: true });
  }

  const sectionMap = useMemo(() => buildSectionMap(perms), [perms]);
  const allSections = useMemo(() => [...sectionMap.keys()], [sectionMap]);
  const groupedSections = useMemo(() => groupSectionsByModule(sectionMap), [sectionMap]);
  const filteredRoles = useMemo(() => sortAndFilterRoles(roles, query), [roles, query]);
  const missingGrantsWarning = draftCodes.has("orders:edit") && draftFieldGrants.length === 0;

  // Dưới lg chế độ hiển thị theo `?role`: có id → chi tiết full màn, không → danh sách.
  const detailMode = !isDesktop && selectedId != null;

  const detailTabs: TabItem[] = selected
    ? [
        {
          key: "perms",
          label: (
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-4 w-4" /> Quyền hạn
            </span>
          ),
          content: (
            <RolePermissionsPanel
              groupedSections={groupedSections}
              draftCodes={draftCodes}
              draftScopes={editor.draftScopes}
              scopeDefault={selected.scope_default ?? "own"}
              readOnly={readOnly}
              onToggle={editor.toggle}
              onToggleSection={editor.toggleSection}
              onToggleModuleGroup={editor.toggleModuleGroup}
              onSetScope={editor.setScope}
            />
          ),
        },
        {
          key: "fields",
          label: (
            <span className="flex items-center gap-1.5">
              <EyeOff className="h-4 w-4" /> Ẩn field khi xem
              {draftFieldRules.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-2xs font-medium text-primary">
                  {draftFieldRules.length}
                </span>
              )}
            </span>
          ),
          content: (
            <RoleFieldRulesPanel
              rules={draftFieldRules}
              setRules={editor.setDraftFieldRules}
              allSections={allSections}
              readOnly={readOnly}
            />
          ),
        },
        {
          key: "field-grants",
          label: (
            <span className="flex items-center gap-1.5">
              <Pencil className="h-4 w-4" /> Sửa field đơn hàng
              {missingGrantsWarning && <TriangleAlert className="h-3.5 w-3.5 text-destructive" />}
              {draftFieldGrants.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-2xs font-medium text-primary">
                  {draftFieldGrants.length}
                </span>
              )}
            </span>
          ),
          content: (
            <RoleFieldGrantsPanel
              groups={fieldCatalogGroups}
              loading={fieldCatalogQuery.isPending}
              grants={draftFieldGrants}
              onSetGrants={editor.setDraftFieldGrants}
              onToggleField={editor.toggleFieldGrant}
              onToggleGroup={editor.toggleFieldGroupGrant}
              missingGrantsWarning={missingGrantsWarning}
              readOnly={readOnly}
            />
          ),
        },
      ]
    : [];

  return (
    <div
      className={
        isDesktop
          ? "flex h-full min-h-0 flex-col gap-4 p-4"
          : "flex h-full min-h-0 flex-col gap-3 p-3"
      }
    >
      {/* Header — ở chế độ chi tiết mobile nhường chỗ cho header chi tiết (có nút quay lại) */}
      {!detailMode &&
        (isDesktop ? (
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Vai trò &amp; Phân quyền
              </span>
            }
            description={`${roles.length} vai trò · phân quyền theo hành động, phạm vi dữ liệu và field`}
            actions={
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Tạo vai trò
              </Button>
            }
          />
        ) : (
          <PageHeader
            className="flex-row items-center justify-between"
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Vai trò &amp; Phân quyền
              </span>
            }
            actions={
              <Button
                size="icon"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                aria-label="Tạo vai trò"
                onClick={() => setCreateOpen(true)}
              >
                <Plus />
              </Button>
            }
          />
        ))}

      {/* Body: desktop 2 pane; mobile chỉ 1 pane (list hoặc chi tiết) chiếm hết chiều cao */}
      <div
        className={
          isDesktop
            ? "grid min-h-0 flex-1 grid-cols-[19rem_1fr] gap-4"
            : "flex min-h-0 flex-1 flex-col"
        }
      >
        {!detailMode && (
          <RoleListSidebar
            query={query}
            onQueryChange={setQuery}
            loading={rolesQuery.isPending}
            roles={filteredRoles}
            selectedId={selectedId}
            onSelect={(id) => void handleSelect(id)}
            mainContent={!isDesktop}
          />
        )}

        {/* Detail */}
        {(isDesktop || detailMode) && (
          <section
            className={
              isDesktop
                ? "flex min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card"
                : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
            }
          >
            {!selected ? (
              isDesktop ? (
                <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Shield className="h-7 w-7" />
                  </span>
                  <p className="text-sm font-medium text-foreground">Chọn một vai trò</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Chọn vai trò bên trái để xem và chỉnh phân quyền, hoặc tạo vai trò mới.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 justify-center py-12">
                  <LogoSpinner label="Đang tải..." />
                </div>
              )
            ) : (
              <>
                <RoleDetailHeader
                  role={selected}
                  codeCount={draftCodes.size}
                  isDirty={editor.isDirty}
                  readOnly={readOnly}
                  saving={editor.saving}
                  onDelete={() => setDeleteOpen(true)}
                  onSave={editor.save}
                  onBack={isDesktop ? undefined : () => void handleBack()}
                />

                <Tabs
                  className="min-h-0 flex-1"
                  active={editor.activeTab}
                  onChange={editor.setActiveTab}
                  mainContentPanel
                  tabs={detailTabs}
                />

                {!isDesktop && !readOnly && (
                  <RoleMobileActionBar
                    isDirty={editor.isDirty}
                    saving={editor.saving}
                    canDelete={!selected.is_system}
                    onSave={() => void editor.save()}
                    onDelete={() => setDeleteOpen(true)}
                  />
                )}
              </>
            )}
          </section>
        )}
      </div>

      <RoleCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setSelectedId} />
      <RoleDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        role={selected}
        onDeleted={() => setSelectedId(null, { replace: true })}
      />
    </div>
  );
}
