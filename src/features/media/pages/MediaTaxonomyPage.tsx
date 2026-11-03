import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n";
import type { TaxonomyGroup } from "@/lib/api/media";

import { mediaCan } from "../access";
import { MediaAccessGate } from "../components/MediaAccessGate";
import { TaxonomyFormDialog } from "../components/TaxonomyFormDialog";
import { TaxonomyRowActions } from "../components/TaxonomyRowActions";
import { TaxonomyTabs } from "../components/TaxonomyTabs";
import { useTaxonomyActions } from "../use-taxonomy-actions";

/**
 * Trang Danh mục Media: 5 tab taxonomy, có tạo/sửa/xoá theo quyền (task 19).
 * Tạo mới nhóm content-sources chỉ cần `taxonomy.write_sources` (uploader
 * được POST riêng nhóm này) — sửa/xoá luôn cần `taxonomy.write` (admin-only),
 * do `TaxonomyRowActions` tự gate.
 */
export default function MediaTaxonomyPage() {
  const { t } = useI18n();
  const [group, setGroup] = useState<TaxonomyGroup>("content-types");
  const [includeInactive, setIncludeInactive] = useState(false);
  const actions = useTaxonomyActions(group);

  return (
    <div className="space-y-4">
      <PageHeader title={t("topnav.tabs.mediaTaxonomy")} />
      <MediaAccessGate>
        {(me) => {
          const canAdd = mediaCan(
            me.role,
            group === "content-sources" ? "taxonomy.write_sources" : "taxonomy.write",
          );
          return (
            <>
              <TaxonomyTabs
                group={group}
                onGroupChange={setGroup}
                includeInactive={includeInactive}
                onIncludeInactiveChange={setIncludeInactive}
                role={me.role}
                headerActions={
                  canAdd ? (
                    <Button onClick={() => actions.setCreateOpen(true)}>
                      {t("media.taxonomy.add")}
                    </Button>
                  ) : null
                }
                rowActions={(item) => (
                  <TaxonomyRowActions
                    item={item}
                    group={group}
                    role={me.role}
                    onEdit={actions.setEditTarget}
                    onDelete={actions.remove}
                  />
                )}
              />
              {actions.createOpen ? (
                <TaxonomyFormDialog
                  key={`create-${group}`}
                  open
                  onOpenChange={actions.setCreateOpen}
                  group={group}
                  onSubmit={actions.submitCreate}
                />
              ) : null}
              {actions.editTarget ? (
                <TaxonomyFormDialog
                  key={`edit-${group}-${actions.editTarget.id}`}
                  open
                  onOpenChange={(open) => {
                    if (!open) actions.setEditTarget(null);
                  }}
                  group={group}
                  initial={actions.editTarget}
                  onSubmit={actions.submitEdit}
                />
              ) : null}
            </>
          );
        }}
      </MediaAccessGate>
    </div>
  );
}
