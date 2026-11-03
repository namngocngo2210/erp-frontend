import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useI18n } from "@/i18n";

import {
  useAssignableUsers,
  useCreateTeam,
  useDeleteTeam,
  useDepartmentTeams,
  useUpdateTeam,
} from "@/features/users/queries";
import { teamUserLabel, type DepartmentTeam } from "@/lib/api/teams";

const LEAD_NONE = "__none__";

type Props = {
  departmentId: number;
};

type FormState = { id: number | "new" | null; name: string; leadId: string; memberIds: string[] };

const EMPTY_FORM: FormState = { id: null, name: "", leadId: LEAD_NONE, memberIds: [] };

/**
 * Quản lý đội nhóm của một phòng ban.
 *
 * Ô chọn lead/thành viên lấy từ TÀI KHOẢN thuộc phòng ban (kể cả người kiêm
 * nhiệm), không từ hồ sơ nhân sự — xem `docs/department-teams.md` §2.3.
 */
export function DepartmentTeamsManager({ departmentId }: Props) {
  const { t } = useI18n();
  const { data: teams } = useDepartmentTeams(departmentId);
  const { data: users } = useAssignableUsers(departmentId);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const userOptions = useMemo(
    () => (users ?? []).map((u) => ({ value: String(u.id), label: teamUserLabel(u) })),
    [users],
  );
  const leadOptions = useMemo(
    () => [
      { value: LEAD_NONE, label: t("departments.team.leadNone", "— Chưa gán —") },
      ...userOptions,
    ],
    [userOptions, t],
  );

  const startCreate = () => setForm({ ...EMPTY_FORM, id: "new" });
  const startEdit = (team: DepartmentTeam) =>
    setForm({
      id: team.id,
      name: team.name,
      leadId: team.lead ? String(team.lead.id) : LEAD_NONE,
      memberIds: team.members.map((m) => String(m.id)),
    });
  const cancel = () => setForm(EMPTY_FORM);

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error(t("departments.team.nameRequired", "Vui lòng nhập tên đội nhóm."));
      return;
    }
    const payload = {
      name,
      lead_user_id: form.leadId === LEAD_NONE ? null : Number(form.leadId),
      member_user_ids: form.memberIds.map(Number),
    };
    const onError = (err: unknown) =>
      toast.error(err instanceof Error ? err.message : t("hr.toast.saveFailed", "Lưu thất bại."));

    if (form.id === "new") {
      createTeam.mutate(
        { departmentId, payload },
        {
          onSuccess: () => {
            toast.success(t("departments.team.created", "Đã tạo đội nhóm."));
            cancel();
          },
          onError,
        },
      );
    } else if (typeof form.id === "number") {
      updateTeam.mutate(
        { teamId: form.id, payload },
        {
          onSuccess: () => {
            toast.success(t("departments.team.updated", "Đã cập nhật đội nhóm."));
            cancel();
          },
          onError,
        },
      );
    }
  };

  const handleDelete = (team: DepartmentTeam) => {
    deleteTeam.mutate(team.id, {
      onSuccess: () => toast.success(t("departments.team.deleted", "Đã xoá đội nhóm.")),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : t("hr.toast.saveFailed", "Xoá thất bại.")),
    });
  };

  const rows = teams ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          {t("departments.team.title", "Đội nhóm")}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={startCreate}>
          <Plus className="mr-1 h-4 w-4" />
          {t("departments.team.add", "Thêm đội nhóm")}
        </Button>
      </div>

      {rows.length === 0 && form.id === null && (
        <p className="text-xs text-muted-foreground">
          {t("departments.team.empty", "Phòng ban chưa có đội nhóm nào.")}
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((team) => (
          <li
            key={team.id}
            className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{team.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t("departments.team.leadLabel", "Trưởng nhóm")}:{" "}
                {team.lead
                  ? teamUserLabel(team.lead)
                  : t("departments.team.leadNone", "— Chưa gán —")}
                {" · "}
                {t("departments.team.memberCount", "Thành viên")}: {team.members.length}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`${t("departments.team.edit", "Sửa đội nhóm")} ${team.name}`}
                onClick={() => startEdit(team)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`${t("departments.team.delete", "Xoá đội nhóm")} ${team.name}`}
                onClick={() => handleDelete(team)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {form.id !== null && (
        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <Input
            placeholder={t("departments.team.namePlaceholder", "Tên đội nhóm")}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <SearchableSelect
            value={form.leadId}
            onChange={(value) => setForm((prev) => ({ ...prev, leadId: value }))}
            options={leadOptions}
            placeholder={t("departments.team.leadPlaceholder", "Chọn trưởng nhóm")}
          />
          <MultiSelect
            options={userOptions}
            selected={form.memberIds}
            onChange={(values) => setForm((prev) => ({ ...prev, memberIds: values }))}
            placeholder={t("departments.team.membersPlaceholder", "Chọn thành viên")}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={cancel}>
              {t("common.cancel", "Huỷ")}
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              {t("common.save", "Lưu")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
