import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
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
import type {
  ChannelKiotvietMapping,
  FbAdAccountOption,
  GoogleAdAccountOption,
} from "@/features/channels/types";

type Props = {
  open: boolean;
  code: string;
  name: string;
  owner: string;
  landingpageSource: string;
  status: string;
  channelTypeId: number | null;
  channelTypes: ChannelType[];
  kiotvietMappings: ChannelKiotvietMapping[];
  fbAdsAccounts: number[];
  availableFbAdsAccounts: FbAdAccountOption[];
  googleAdsAccounts: number[];
  availableGoogleAdsAccounts: GoogleAdAccountOption[];
  kiotvietChannels: { id: number; name: string }[];
  onOpenChange: (open: boolean) => void;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onLandingpageSourceChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onChannelTypeIdChange: (value: number | null) => void;
  onKiotvietMappingsChange: (value: ChannelKiotvietMapping[]) => void;
  onFbAdsAccountsChange: (value: number[]) => void;
  onGoogleAdsAccountsChange: (value: number[]) => void;
  onSubmit: () => void;
};

export function ChannelCreateDialog({
  open,
  code,
  name,
  owner,
  landingpageSource,
  status,
  channelTypeId,
  channelTypes,
  kiotvietMappings,
  fbAdsAccounts,
  availableFbAdsAccounts,
  googleAdsAccounts,
  availableGoogleAdsAccounts,
  kiotvietChannels,
  onOpenChange,
  onCodeChange,
  onNameChange,
  onOwnerChange,
  onLandingpageSourceChange,
  onStatusChange,
  onChannelTypeIdChange,
  onKiotvietMappingsChange,
  onFbAdsAccountsChange,
  onGoogleAdsAccountsChange,
  onSubmit,
}: Props) {
  const { t } = useI18n();
  const fbAds = resolveAdAccountSelection(
    groupAdAccountOptions(availableFbAdsAccounts, (acc) => acc.account_id),
    fbAdsAccounts,
  );
  const googleAds = resolveAdAccountSelection(
    groupAdAccountOptions(availableGoogleAdsAccounts, (acc) => acc.customer_id),
    googleAdsAccounts,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("channels.create.title")}
        description={t("channels.create.description")}
        footer={
          <>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onSubmit}
            >
              {t("common.create")}
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <div>
            <label
              htmlFor="channel-create-code"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("channels.fields.code")}
            </label>
            <Input
              id="channel-create-code"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="lp-d"
            />
          </div>
          <div>
            <label
              htmlFor="channel-create-name"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("channels.fields.name")}
            </label>
            <Input
              id="channel-create-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Landing D"
            />
          </div>
          <div>
            <label
              htmlFor="channel-create-owner"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("channels.fields.owner")}
            </label>
            <Input
              id="channel-create-owner"
              value={owner}
              onChange={(e) => onOwnerChange(e.target.value)}
              placeholder="Nam_ADS"
            />
          </div>
          <div>
            <label
              htmlFor="channel-create-status"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.status")}
            </label>
            <Select value={status} onValueChange={(value) => onStatusChange(value ?? "true")}>
              <SelectTrigger id="channel-create-status">
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
              htmlFor="channel-create-channel-type"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("channels.fields.channelType", "Loại kênh")}
            </label>
            <Select
              value={channelTypeId === null ? "__none__" : String(channelTypeId)}
              onValueChange={(value) =>
                onChannelTypeIdChange(value === "__none__" ? null : Number(value))
              }
            >
              <SelectTrigger id="channel-create-channel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("channels.fields.channelTypeNone", "(Chưa phân loại)")}
                </SelectItem>
                {channelTypes.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
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
              idPrefix="channel-create-kvmap"
              value={kiotvietMappings}
              onChange={onKiotvietMappingsChange}
              kiotvietChannels={kiotvietChannels}
            />
          </div>
          <div className="col-span-full">
            <label
              htmlFor="channel-create-source"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("channels.fields.landingSource")}
            </label>
            <textarea
              id="channel-create-source"
              value={landingpageSource}
              onChange={(e) => onLandingpageSourceChange(e.target.value)}
              placeholder={t("channels.placeholders.landingSource")}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
            />
          </div>
          <div className="col-span-full">
            <label
              htmlFor="channel-create-fb-ads"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("channels.fields.fbAdsAccounts", "Tài khoản quảng cáo Facebook")}
            </label>
            <MultiSelect
              id="channel-create-fb-ads"
              placeholder={t("channels.placeholders.fbAdsAccounts", "Chọn tài khoản quảng cáo")}
              options={fbAds.options}
              selected={fbAds.selected}
              onChange={(values) => onFbAdsAccountsChange(values.map(Number))}
              emptyText={t(
                "channels.placeholders.fbAdsAccountsEmpty",
                "Chưa có tài khoản quảng cáo nào",
              )}
              menuPortal
            />
          </div>
          <div className="col-span-full">
            <label
              htmlFor="channel-create-google-ads"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("channels.fields.googleAdsAccounts", "Tài khoản quảng cáo Google")}
            </label>
            <MultiSelect
              id="channel-create-google-ads"
              placeholder={t(
                "channels.placeholders.googleAdsAccounts",
                "Chọn tài khoản Google Ads",
              )}
              options={googleAds.options}
              selected={googleAds.selected}
              onChange={(values) => onGoogleAdsAccountsChange(values.map(Number))}
              emptyText={t(
                "channels.placeholders.googleAdsAccountsEmpty",
                "Chưa có tài khoản Google Ads nào",
              )}
              menuPortal
            />
          </div>
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
