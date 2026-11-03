import { UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KiotvietMappingsEditor } from "@/features/channels/KiotvietMappingsEditor";
import { groupAdAccountOptions, resolveAdAccountSelection } from "@/features/channels/utils";
import { useI18n } from "@/i18n";
import type { ChannelType } from "@/lib/api/channels";
import type { PriceBook } from "@/lib/api/price-books";
import type {
  ChannelKiotvietMapping,
  ChannelRow,
  FbAdAccountOption,
  GoogleAdAccountOption,
  StaffUser,
} from "@/features/channels/types";

type Props = {
  open: boolean;
  manageRow: ChannelRow | null;
  editName: string;
  editOwner: string;
  editLandingpageSource: string;
  editStatus: string;
  editKiotvietMappings: ChannelKiotvietMapping[];
  editFbAdsAccounts: number[];
  editGoogleAdsAccounts: number[];
  editPriceBookId: number | null;
  editChannelTypeId: number | null;
  savingInfo: boolean;
  assignedUsers: StaffUser[];
  assignableStaff: StaffUser[];
  selectedAssignmentUserId: number | null;
  isAssigning: boolean;
  availableFbAdsAccounts: FbAdAccountOption[];
  availableGoogleAdsAccounts: GoogleAdAccountOption[];
  priceBooks: PriceBook[];
  channelTypes: ChannelType[];
  kiotvietChannels: { id: number; name: string }[];
  onOpenChange: (open: boolean) => void;
  onEditNameChange: (value: string) => void;
  onEditOwnerChange: (value: string) => void;
  onEditLandingpageSourceChange: (value: string) => void;
  onEditStatusChange: (value: string) => void;
  onEditKiotvietMappingsChange: (value: ChannelKiotvietMapping[]) => void;
  onEditFbAdsAccountsChange: (value: number[]) => void;
  onEditGoogleAdsAccountsChange: (value: number[]) => void;
  onEditPriceBookIdChange: (value: number | null) => void;
  onEditChannelTypeIdChange: (value: number | null) => void;
  onSaveInfo: () => void;
  onSelectedAssignmentUserIdChange: (value: number | null) => void;
  onAddAssignments: () => void;
  onRemoveAssignment: (userId: number) => void;
};

export function ChannelManageDialog({
  open,
  manageRow,
  editName,
  editOwner,
  editLandingpageSource,
  editStatus,
  editKiotvietMappings,
  editFbAdsAccounts,
  editGoogleAdsAccounts,
  editPriceBookId,
  editChannelTypeId,
  savingInfo,
  assignedUsers,
  assignableStaff,
  selectedAssignmentUserId,
  isAssigning,
  availableFbAdsAccounts,
  availableGoogleAdsAccounts,
  priceBooks,
  channelTypes,
  kiotvietChannels,
  onOpenChange,
  onEditNameChange,
  onEditOwnerChange,
  onEditLandingpageSourceChange,
  onEditStatusChange,
  onEditKiotvietMappingsChange,
  onEditFbAdsAccountsChange,
  onEditGoogleAdsAccountsChange,
  onEditPriceBookIdChange,
  onEditChannelTypeIdChange,
  onSaveInfo,
  onSelectedAssignmentUserIdChange,
  onAddAssignments,
  onRemoveAssignment,
}: Props) {
  const { t } = useI18n();
  const assignableOptions = assignableStaff.map((staff) => ({
    value: String(staff.id),
    label: staff.username,
  }));
  const selectedValue =
    assignableOptions.find((option) => Number(option.value) === selectedAssignmentUserId)?.value ??
    "";
  const fbAds = resolveAdAccountSelection(
    groupAdAccountOptions(availableFbAdsAccounts, (acc) => acc.account_id),
    editFbAdsAccounts,
  );
  const googleAds = resolveAdAccountSelection(
    groupAdAccountOptions(availableGoogleAdsAccounts, (acc) => acc.customer_id),
    editGoogleAdsAccounts,
  );
  // Kênh có thể đang gán một bảng giá đã bị tắt (is_active=false) — vẫn phải hiện
  // rõ tên bảng đó trong trigger (kèm nhãn phân biệt), nếu không trigger trắng trơn
  // dễ khiến người quản lý tưởng "chưa gán" rồi bấm "(Theo mặc định)" và vô tình
  // gỡ gán thật (đơn của kênh lặng lẽ rơi về giá mặc định).
  const assignedInactivePriceBook = priceBooks.find(
    (book) => book.id === editPriceBookId && !book.is_active,
  );
  const priceBookOptions = assignedInactivePriceBook
    ? [assignedInactivePriceBook, ...priceBooks.filter((book) => book.is_active)]
    : priceBooks.filter((book) => book.is_active);
  // Cùng bẫy như bảng giá ở trên: kênh có thể đang gán loại kênh đã bị tắt. BE chỉ
  // TRẢ VỀ loại đang bật ở /api/channels/types nên nó không có trong `channelTypes`;
  // ghép thêm từ chính dòng kênh để trigger không trắng trơn rồi bị gỡ nhầm.
  const assignedType = manageRow?.channel_type ?? null;
  const activeTypes = channelTypes.filter((type) => type.is_active);
  const channelTypeOptions =
    assignedType && !activeTypes.some((type) => type.id === assignedType.id)
      ? [{ ...assignedType, is_active: false }, ...activeTypes]
      : activeTypes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("channels.manage.title")}
        description={t("channels.manage.code", `Channel code: ${manageRow?.code ?? ""}`).replace(
          "{code}",
          manageRow?.code ?? "",
        )}
        footer={
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")}
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium">{t("channels.manage.channelInfo")}</p>
            <FormGrid columns={2}>
              <div>
                <label
                  htmlFor="channel-manage-name"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("channels.fields.name")}
                </label>
                <Input
                  id="channel-manage-name"
                  value={editName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="channel-manage-status"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("users.fields.status")}
                </label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => onEditStatusChange(value ?? "true")}
                >
                  <SelectTrigger id="channel-manage-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("common.active")}</SelectItem>
                    <SelectItem value="false">{t("common.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="channel-manage-owner"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("channels.fields.owner")}
                </label>
                <Input
                  id="channel-manage-owner"
                  value={editOwner}
                  onChange={(e) => onEditOwnerChange(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="channel-manage-channel-type"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("channels.fields.channelType", "Loại kênh")}
                </label>
                <Select
                  value={editChannelTypeId === null ? "__none__" : String(editChannelTypeId)}
                  onValueChange={(value) =>
                    onEditChannelTypeIdChange(value === "__none__" ? null : Number(value))
                  }
                >
                  <SelectTrigger id="channel-manage-channel-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("channels.fields.channelTypeNone", "(Chưa phân loại)")}
                    </SelectItem>
                    {channelTypeOptions.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.is_active
                          ? type.name
                          : t("channels.fields.channelTypeInactive", "{name} (đã ẩn)").replace(
                              "{name}",
                              type.name,
                            )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="channel-manage-price-book"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("channels.fields.priceBook", "Bảng giá")}
                </label>
                <Select
                  value={editPriceBookId === null ? "__none__" : String(editPriceBookId)}
                  onValueChange={(value) =>
                    onEditPriceBookIdChange(value === "__none__" ? null : Number(value))
                  }
                >
                  <SelectTrigger id="channel-manage-price-book">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("channels.fields.priceBookDefault", "(Theo mặc định)")}
                    </SelectItem>
                    {priceBookOptions.map((book) => (
                      <SelectItem key={book.id} value={String(book.id)}>
                        {book.is_active
                          ? book.name
                          : t("channels.fields.priceBookInactive", "{name} (đã ẩn)").replace(
                              "{name}",
                              book.name,
                            )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-full">
                <label className="mb-1 block text-sm text-muted-foreground">
                  {t("channels.fields.kiotvietMappings", "Mapping KiotViet")}
                </label>
                <KiotvietMappingsEditor
                  idPrefix="channel-manage-kvmap"
                  value={editKiotvietMappings}
                  onChange={onEditKiotvietMappingsChange}
                  kiotvietChannels={kiotvietChannels}
                />
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="channel-manage-source"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("channels.fields.landingSource")}
                </label>
                <textarea
                  id="channel-manage-source"
                  value={editLandingpageSource}
                  onChange={(e) => onEditLandingpageSourceChange(e.target.value)}
                  className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
                />
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="channel-manage-fb-ads"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("channels.fields.fbAdsAccounts", "Tài khoản quảng cáo Facebook")}
                </label>
                <MultiSelect
                  id="channel-manage-fb-ads"
                  placeholder={t("channels.placeholders.fbAdsAccounts", "Chọn tài khoản quảng cáo")}
                  options={fbAds.options}
                  selected={fbAds.selected}
                  onChange={(values) => onEditFbAdsAccountsChange(values.map(Number))}
                  emptyText={t(
                    "channels.placeholders.fbAdsAccountsEmpty",
                    "Chưa có tài khoản quảng cáo nào",
                  )}
                  menuPortal
                />
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="channel-manage-google-ads"
                  className="mb-1 block text-sm text-muted-foreground"
                >
                  {t("channels.fields.googleAdsAccounts", "Tài khoản quảng cáo Google")}
                </label>
                <MultiSelect
                  id="channel-manage-google-ads"
                  placeholder={t(
                    "channels.placeholders.googleAdsAccounts",
                    "Chọn tài khoản Google Ads",
                  )}
                  options={googleAds.options}
                  selected={googleAds.selected}
                  onChange={(values) => onEditGoogleAdsAccountsChange(values.map(Number))}
                  emptyText={t(
                    "channels.placeholders.googleAdsAccountsEmpty",
                    "Chưa có tài khoản Google Ads nào",
                  )}
                  menuPortal
                />
              </div>
              <div className="col-span-full">
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onSaveInfo}
                  disabled={savingInfo}
                >
                  {savingInfo ? t("common.saving") : t("channels.manage.saveInfo")}
                </Button>
              </div>
            </FormGrid>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">
                {t("channels.manage.currentAdsAssignees", "User phòng Ads đã gán")}
              </p>
              <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
                {assignedUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("channels.manage.noAssignees")}
                  </p>
                )}
                {assignedUsers.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between rounded-md border border-border/80 px-1.5 py-0.5"
                  >
                    <span className="text-xs">{staff.username}</span>
                    <Button
                      title={t("channels.actions.unassign")}
                      aria-label={t("channels.actions.unassign")}
                      size="icon-xs"
                      variant="outline"
                      className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                      onClick={() => onRemoveAssignment(staff.id)}
                    >
                      <UserRoundX className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">
                {t("channels.manage.assignAds", "Gán user phòng Ads")}
              </p>
              <SearchableSelect
                id="channel-assignment-select"
                clearable
                aria-label={t("channels.manage.assignAds", "Gán user phòng Ads")}
                placeholder={t("channels.placeholders.selectAdsStaff", "Chọn user phòng Ads")}
                options={assignableOptions}
                value={selectedValue}
                onChange={(value) => onSelectedAssignmentUserIdChange(value ? Number(value) : null)}
                emptyText={() =>
                  t("channels.manage.noAdsStaff", "Không có user phòng Ads khả dụng")
                }
              />
              <Button
                className="w-full"
                onClick={onAddAssignments}
                disabled={isAssigning || !selectedAssignmentUserId}
              >
                {isAssigning ? t("channels.manage.assigning") : t("channels.manage.addStaff")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t(
                  "channels.manage.assignAdsHint",
                  "Chỉ user thuộc phòng Ads mới được gán vào kênh.",
                )}
              </p>
            </div>
          </div>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
