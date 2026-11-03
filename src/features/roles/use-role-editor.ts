import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { PermissionRow, Role } from "@/lib/api/roles";
import { SCOPE_SENTINEL_DEFAULT } from "./constants";
import { toggleGroup } from "./permission-logic";
import { useUpdateRole } from "./queries";
import {
  buildRoleUpdateBody,
  isRoleDraftDirty,
  setCodes,
  type FieldRuleDraft,
  type GroupedSection,
} from "./role-draft";

/** Bản nháp phân quyền của role đang chọn: toggle quyền/phạm vi/field + lưu. */
export function useRoleEditor(selectedId: number | null, selected: Role | null) {
  const updateMutation = useUpdateRole();
  const [activeTab, setActiveTab] = useState("perms");
  const [draftCodes, setDraftCodes] = useState<Set<string>>(new Set());
  const [draftScopes, setDraftScopes] = useState<Record<string, string>>({});
  const [draftFieldRules, setDraftFieldRules] = useState<FieldRuleDraft[]>([]);
  const [draftFieldGrants, setDraftFieldGrants] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Khi đổi role được chọn → nạp draft từ role đó.
  useEffect(() => {
    setDraftCodes(new Set(selected?.permission_codes ?? []));
    setDraftScopes({ ...(selected?.section_scopes ?? {}) });
    setDraftFieldRules((selected?.field_rules ?? []).map((r) => ({ ...r })));
    setDraftFieldGrants([...(selected?.field_grants ?? [])]);
    setActiveTab("perms");
  }, [
    selectedId,
    selected?.permission_codes,
    selected?.section_scopes,
    selected?.field_rules,
    selected?.field_grants,
  ]);

  const readOnly = !!selected?.is_system;

  const isDirty = useMemo(() => {
    if (!selected) return false;
    return isRoleDraftDirty(selected, {
      codes: draftCodes,
      scopes: draftScopes,
      fieldRules: draftFieldRules,
      fieldGrants: draftFieldGrants,
    });
  }, [selected, draftCodes, draftScopes, draftFieldRules, draftFieldGrants]);

  function toggle(code: string) {
    if (readOnly) return;
    setDraftCodes((prev) => setCodes(prev, [code], !prev.has(code)));
  }

  function toggleSection(actions: PermissionRow[], on: boolean) {
    if (readOnly) return;
    setDraftCodes((prev) =>
      setCodes(
        prev,
        actions.map((a) => a.code),
        on,
      ),
    );
  }

  // Toggle cả nhóm module ở tab Quyền hạn (perms) — không liên quan đến
  // groupState/toggleGroup thuần ở permission-logic.ts (đó là cho tab cấu hình sửa field).
  function toggleModuleGroup(rows: GroupedSection[], on: boolean) {
    if (readOnly) return;
    setDraftCodes((prev) =>
      setCodes(
        prev,
        rows.flatMap((r) => r.actions.map((a) => a.code)),
        on,
      ),
    );
  }

  function setScope(section: string, scope: string) {
    setDraftScopes((prev) => {
      const next = { ...prev };
      if (scope === SCOPE_SENTINEL_DEFAULT) delete next[section];
      else next[section] = scope;
      return next;
    });
  }

  function toggleFieldGrant(field: string) {
    if (readOnly) return;
    setDraftFieldGrants((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }

  function toggleFieldGroupGrant(groupFields: string[]) {
    if (readOnly) return;
    setDraftFieldGrants((prev) => toggleGroup(prev, groupFields));
  }

  async function save() {
    if (!selected || readOnly) return;
    setSaving(true);
    try {
      // mutateAsync resolve sau khi list roles refetch xong (invalidate trong hook).
      await updateMutation.mutateAsync({
        id: selected.id,
        body: buildRoleUpdateBody({
          codes: draftCodes,
          scopes: draftScopes,
          fieldRules: draftFieldRules,
          fieldGrants: draftFieldGrants,
        }),
      });
      toast.success("Đã lưu phân quyền.");
    } catch {
      toast.error("Lưu phân quyền thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return {
    activeTab,
    setActiveTab,
    draftCodes,
    draftScopes,
    draftFieldRules,
    setDraftFieldRules,
    draftFieldGrants,
    setDraftFieldGrants,
    readOnly,
    isDirty,
    saving,
    toggle,
    toggleSection,
    toggleModuleGroup,
    setScope,
    toggleFieldGrant,
    toggleFieldGroupGrant,
    save,
  };
}
