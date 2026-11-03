import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useI18n } from "@/i18n";

type OldChannelOption = {
  id: number;
  name: string;
  branchIds: string[];
};

export type SyncBranchPairDraft = {
  source: string;
  target: string;
};

type Props = {
  open: boolean;
  title: string;
  description: string;
  name: string;
  branchIdsText: string;
  syncBranchPairs: SyncBranchPairDraft[];
  sourceBranchIds: string[];
  clientId: string;
  clientSecret: string;
  retailer: string;
  username: string;
  password: string;
  isOldKiot: boolean;
  vatTaxIdText: string;
  oldChannelOptions: OldChannelOption[];
  pairedOldChannelId: number | null;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onBranchIdsTextChange: (value: string) => void;
  onSyncBranchPairsChange: (value: SyncBranchPairDraft[]) => void;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onRetailerChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onIsOldKiotChange: (value: boolean) => void;
  onVatTaxIdTextChange: (value: string) => void;
  onPairedOldChannelIdChange: (value: number | null) => void;
  onSubmit: () => void;
};

const EMPTY_SELECT_VALUE = "none";

function PairBranchSelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = value && options.includes(value) ? value : "";
  return (
    <Select
      value={selected || EMPTY_SELECT_VALUE}
      onValueChange={(next) => onChange(next === EMPTY_SELECT_VALUE ? "" : next)}
      disabled={disabled || options.length === 0}
    >
      <SelectTrigger id={id} aria-label={placeholder}>
        <span className={selected ? "" : "text-muted-foreground"}>{selected || placeholder}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>{placeholder}</SelectItem>
        {options.map((branchId) => (
          <SelectItem key={branchId} value={branchId}>
            {branchId}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function KiotVietDialog({
  open,
  title,
  description,
  name,
  branchIdsText,
  syncBranchPairs,
  sourceBranchIds,
  clientId,
  clientSecret,
  retailer,
  username,
  password,
  isOldKiot,
  vatTaxIdText,
  oldChannelOptions,
  pairedOldChannelId,
  onOpenChange,
  onNameChange,
  onBranchIdsTextChange,
  onSyncBranchPairsChange,
  onClientIdChange,
  onClientSecretChange,
  onRetailerChange,
  onUsernameChange,
  onPasswordChange,
  onIsOldKiotChange,
  onVatTaxIdTextChange,
  onPairedOldChannelIdChange,
  onSubmit,
}: Props) {
  const { t } = useI18n();
  const emptyPairedOldChannelValue = "none";
  const pairedOldChannelValue =
    pairedOldChannelId === null ? emptyPairedOldChannelValue : String(pairedOldChannelId);
  const selectedPairedOldChannel =
    oldChannelOptions.find((channel) => channel.id === pairedOldChannelId) ?? null;
  const pairedOldChannelLabel =
    selectedPairedOldChannel?.name ?? t("kiotviet.fields.pairedOldChannelNone");
  const targetBranchIds = selectedPairedOldChannel?.branchIds ?? [];

  const updatePair = (index: number, patch: Partial<SyncBranchPairDraft>) => {
    onSyncBranchPairsChange(
      syncBranchPairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)),
    );
  };

  const removePair = (index: number) => {
    onSyncBranchPairsChange(syncBranchPairs.filter((_, i) => i !== index));
  };

  const addPair = () => {
    onSyncBranchPairsChange([...syncBranchPairs, { source: "", target: "" }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={title}
        description={description}
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
              {t("common.save")}
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          {/* Left column */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="kiotviet-name" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.name")}
              </label>
              <Input
                id="kiotviet-name"
                placeholder={t("kiotviet.fields.name")}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="kiotviet-branch-ids" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.branchIds")}
              </label>
              <textarea
                id="kiotviet-branch-ids"
                placeholder={"111\n222\n333"}
                value={branchIdsText}
                onChange={(e) => onBranchIdsTextChange(e.target.value)}
                className="min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-hidden ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <input
                id="kiotviet-is-old"
                type="checkbox"
                checked={isOldKiot}
                onChange={(e) => onIsOldKiotChange(e.target.checked)}
              />
              <label htmlFor="kiotviet-is-old" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.isOldKiot")}
              </label>
            </div>

            {!isOldKiot ? (
              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="space-y-1">
                  <label
                    htmlFor="kiotviet-paired-old-channel"
                    className="text-sm text-muted-foreground"
                  >
                    {t("kiotviet.fields.pairedOldChannel")}
                  </label>
                  <Select
                    value={pairedOldChannelValue}
                    onValueChange={(value) =>
                      onPairedOldChannelIdChange(
                        value === emptyPairedOldChannelValue ? null : Number(value),
                      )
                    }
                  >
                    <SelectTrigger id="kiotviet-paired-old-channel">
                      <span className={selectedPairedOldChannel ? "" : "text-muted-foreground"}>
                        {pairedOldChannelLabel}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={emptyPairedOldChannelValue}>
                        {t("kiotviet.fields.pairedOldChannelNone")}
                      </SelectItem>
                      {oldChannelOptions.map((channel) => (
                        <SelectItem key={channel.id} value={String(channel.id)}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("kiotviet.fields.syncBranchPairs")}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addPair}
                      disabled={!selectedPairedOldChannel}
                      className="inline-flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      {t("kiotviet.actions.addSyncBranchPair")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("kiotviet.fields.syncBranchPairsHint")}
                  </p>
                  {syncBranchPairs.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                      {t("kiotviet.fields.syncBranchPairsEmpty")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {syncBranchPairs.map((pair, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <PairBranchSelect
                              id={`kiotviet-sync-pair-source-${index}`}
                              value={pair.source}
                              options={sourceBranchIds}
                              placeholder={t("kiotviet.fields.syncBranchPairSource")}
                              onChange={(value) => updatePair(index, { source: value })}
                            />
                          </div>
                          <span className="shrink-0 text-muted-foreground">→</span>
                          <div className="min-w-0 flex-1">
                            <PairBranchSelect
                              id={`kiotviet-sync-pair-target-${index}`}
                              value={pair.target}
                              options={targetBranchIds}
                              placeholder={t("kiotviet.fields.syncBranchPairTarget")}
                              disabled={!selectedPairedOldChannel}
                              onChange={(value) => updatePair(index, { target: value })}
                            />
                          </div>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            className="shrink-0 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                            aria-label={t("kiotviet.actions.removeSyncBranchPair")}
                            title={t("kiotviet.actions.removeSyncBranchPair")}
                            onClick={() => removePair(index)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right column */}
          <div className="space-y-4 rounded-md border border-border/60 bg-muted/20 p-3">
            <div className="space-y-1">
              <label htmlFor="kiotviet-client-id" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.clientId")}
              </label>
              <Input
                id="kiotviet-client-id"
                placeholder="Client ID"
                value={clientId}
                onChange={(e) => onClientIdChange(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="kiotviet-client-secret" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.clientSecret")}
              </label>
              <Input
                id="kiotviet-client-secret"
                type="password"
                placeholder="Client Secret"
                value={clientSecret}
                onChange={(e) => onClientSecretChange(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="kiotviet-retailer" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.retailer")}
              </label>
              <Input
                id="kiotviet-retailer"
                placeholder="Retailer"
                value={retailer}
                onChange={(e) => onRetailerChange(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="kiotviet-vat-tax-id" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.vatTaxId")}
              </label>
              <Input
                id="kiotviet-vat-tax-id"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder={t("kiotviet.fields.vatTaxIdPlaceholder")}
                value={vatTaxIdText}
                onChange={(e) => onVatTaxIdTextChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("kiotviet.fields.vatTaxIdHint")}</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="kiotviet-username" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.username", "Username")}
              </label>
              <Input
                id="kiotviet-username"
                placeholder={t("kiotviet.fields.username", "Username")}
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="kiotviet-password" className="text-sm text-muted-foreground">
                {t("kiotviet.fields.password", "Password")}
              </label>
              <Input
                id="kiotviet-password"
                type="password"
                placeholder={t("kiotviet.fields.password", "Password")}
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
          </div>
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
