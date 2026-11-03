import React from "react";
import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

import {
  CHECKBOX_COL_WIDTH,
  CODE_COL_WIDTH,
  NAME_COL_WIDTH,
  ORDER_ROW_STICKY_TINT,
} from "../customer-types";
import { orderToProfileRow } from "../customer-utils";
import type { UseCustomersDataReturn } from "../use-customers-data";
import { CustomerGroupCells } from "./CustomerGroupCells";

interface CustomersTableProps {
  canManageUsers: boolean;
  data: UseCustomersDataReturn;
}

export function CustomersTable({ canManageUsers, data }: CustomersTableProps) {
  const { t } = useI18n();
  const {
    profiles,
    loading,
    activeGroups,
    groupColumnLabels,
    dataColumnCount,
    stickyOffsets,
    allChecked,
    selectedCustomerIds,
    toggleSelectAll,
    toggleSelectRow,
    expandedId,
    ordersCache,
    ordersLoadingId,
    handleToggleExpand,
    handleOpenEdit,
    handleDelete,
    personaLabels,
    editingResale,
    resaleDraft,
    setResaleDraft,
    startResaleEdit,
    cancelResaleEdit,
    saveResaleEdit,
  } = data;

  const identityHeadStyle = (groupKey: string, index: number) => {
    if (groupKey !== "identity") return undefined;
    if (index === 0)
      return { left: stickyOffsets.code, width: CODE_COL_WIDTH, minWidth: CODE_COL_WIDTH };
    if (index === 1)
      return { left: stickyOffsets.name, width: NAME_COL_WIDTH, minWidth: NAME_COL_WIDTH };
    return undefined;
  };

  const renderCells = (
    profile: Parameters<typeof CustomerGroupCells>[0]["profile"],
    groupKey: Parameters<typeof CustomerGroupCells>[0]["groupKey"],
    variant: "profile" | "order" = "profile",
  ) => (
    <CustomerGroupCells
      profile={profile}
      groupKey={groupKey}
      variant={variant}
      stickyOffsets={stickyOffsets}
      personaLabels={personaLabels}
      editingResale={editingResale}
      resaleDraft={resaleDraft}
      onResaleDraftChange={setResaleDraft}
      onSaveResale={saveResaleEdit}
      onCancelResale={cancelResaleEdit}
      onStartResaleEdit={startResaleEdit}
    />
  );

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-max [&_td]:px-3 [&_th]:px-3">
        <TableHeader>
          {/* Tầng 1: nhóm cột */}
          <TableRow>
            <TableHead
              style={{
                left: stickyOffsets.chevron,
                width: CHECKBOX_COL_WIDTH,
                minWidth: CHECKBOX_COL_WIDTH,
              }}
              className="sticky-col h-9 px-1!"
            />
            {canManageUsers && (
              <TableHead
                style={{
                  left: stickyOffsets.checkbox,
                  width: CHECKBOX_COL_WIDTH,
                  minWidth: CHECKBOX_COL_WIDTH,
                }}
                className="sticky-col h-9 px-1! text-center shadow-[1px_0_0_0_var(--border)]"
              >
                <input
                  className="size-3.5"
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleSelectAll}
                  aria-label={t("common.selectAll", "Chọn tất cả")}
                />
              </TableHead>
            )}
            {activeGroups.map((group) => (
              <TableHead
                key={group.key}
                colSpan={groupColumnLabels[group.key].length}
                className="h-9 whitespace-nowrap border-l border-border text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  {group.icon ? (
                    <group.icon aria-hidden="true" className="size-4 shrink-0" />
                  ) : null}
                  {group.label}
                </span>
              </TableHead>
            ))}
            {canManageUsers && <TableHead className="h-9 border-l border-border" />}
          </TableRow>
          {/* Tầng 2: tên cột */}
          <TableRow>
            <TableHead
              style={{
                left: stickyOffsets.chevron,
                width: CHECKBOX_COL_WIDTH,
                minWidth: CHECKBOX_COL_WIDTH,
              }}
              className="sticky-col h-9 px-1!"
            />
            {canManageUsers && (
              <TableHead
                style={{
                  left: stickyOffsets.checkbox,
                  width: CHECKBOX_COL_WIDTH,
                  minWidth: CHECKBOX_COL_WIDTH,
                }}
                className="sticky-col h-9 px-1! shadow-[1px_0_0_0_var(--border)]"
              />
            )}
            {activeGroups.map((group) =>
              groupColumnLabels[group.key].map((label, index) => (
                <TableHead
                  key={`${group.key}-${label}-${index}`}
                  // Nhãn "Mã KH"/"Họ tên" dính cùng ô thân bảng (CustomerGroupCells) để không lệch khi cuộn ngang.
                  style={identityHeadStyle(group.key, index)}
                  className={cn(
                    "h-9 whitespace-nowrap text-xs font-medium text-muted-foreground",
                    index === 0 && "border-l border-border",
                    group.key === "identity" && index === 0 && "sticky-col",
                    group.key === "identity" && index === 1 && "sticky-col sticky-col-edge",
                  )}
                >
                  {label}
                </TableHead>
              )),
            )}
            {canManageUsers && (
              <TableHead className="h-9 border-l border-border text-right text-xs font-medium text-muted-foreground">
                {t("common.actions", "Hành động")}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={dataColumnCount} className="py-8 text-center">
                <LogoSpinner label={t("common.loading", "Đang tải")} className="mx-auto" />
              </TableCell>
            </TableRow>
          ) : profiles.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={dataColumnCount}
                className="py-8 text-center text-muted-foreground"
              >
                {t("customers.list.empty", "Không có khách hàng nào.")}
              </TableCell>
            </TableRow>
          ) : (
            profiles.map((profile) => {
              const id = profile.identity.id;
              const isExpanded = expandedId === id;
              return (
                <React.Fragment key={id}>
                  <TableRow className="align-top">
                    <TableCell
                      style={{
                        left: stickyOffsets.chevron,
                        width: CHECKBOX_COL_WIDTH,
                        minWidth: CHECKBOX_COL_WIDTH,
                      }}
                      className="sticky-col px-1! text-center"
                    >
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("customers.profile.toggleHistory", "Lịch sử mua hàng")}
                        onClick={() => handleToggleExpand(id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    {canManageUsers && (
                      <TableCell
                        style={{
                          left: stickyOffsets.checkbox,
                          width: CHECKBOX_COL_WIDTH,
                          minWidth: CHECKBOX_COL_WIDTH,
                        }}
                        className="sticky-col px-1! text-center shadow-[1px_0_0_0_var(--border)]"
                      >
                        <input
                          className="size-3.5"
                          type="checkbox"
                          checked={selectedCustomerIds.includes(id)}
                          onChange={() => toggleSelectRow(id)}
                          aria-label={t("customers.actions.selectRow", "Chọn hàng")}
                        />
                      </TableCell>
                    )}
                    {activeGroups.map((group) => (
                      <React.Fragment key={group.key}>
                        {renderCells(profile, group.key)}
                      </React.Fragment>
                    ))}
                    {canManageUsers && (
                      <TableCell className="whitespace-nowrap border-l border-border text-right">
                        <Button
                          title={t("common.edit", "Sửa")}
                          aria-label={t("common.edit", "Sửa")}
                          size="icon-sm"
                          variant="outline"
                          className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleOpenEdit(profile)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          title={t("common.delete", "Xóa")}
                          aria-label={t("common.delete", "Xóa")}
                          size="icon-sm"
                          variant="outline"
                          className="ml-1 border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground"
                          onClick={() => handleDelete(profile)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {isExpanded && (
                    <>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell
                          colSpan={dataColumnCount}
                          className="bg-muted/30 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {t("customers.profile.orderHistory", "Lịch sử mua hàng")}
                        </TableCell>
                      </TableRow>
                      {ordersLoadingId === id ? (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell
                            colSpan={dataColumnCount}
                            className="py-4 text-center text-muted-foreground"
                          >
                            {t("common.loading", "Đang tải")}
                          </TableCell>
                        </TableRow>
                      ) : (ordersCache[id] || []).length === 0 ? (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell
                            colSpan={dataColumnCount}
                            className="py-4 text-center text-sm text-muted-foreground"
                          >
                            {t("customers.profile.noOrders", "Chưa có đơn hàng nào.")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        (ordersCache[id] || []).map((order) => (
                          <TableRow
                            key={`order-${order.id}`}
                            className="bg-muted/20 hover:bg-muted/30"
                          >
                            <TableCell
                              style={{
                                left: stickyOffsets.chevron,
                                width: CHECKBOX_COL_WIDTH,
                                minWidth: CHECKBOX_COL_WIDTH,
                              }}
                              className={cn("sticky-col px-1!", ORDER_ROW_STICKY_TINT)}
                            />
                            {canManageUsers && (
                              <TableCell
                                style={{
                                  left: stickyOffsets.checkbox,
                                  width: CHECKBOX_COL_WIDTH,
                                  minWidth: CHECKBOX_COL_WIDTH,
                                }}
                                className={cn(
                                  "sticky-col px-1! shadow-[1px_0_0_0_var(--border)]",
                                  ORDER_ROW_STICKY_TINT,
                                )}
                              />
                            )}
                            {activeGroups.map((group) => (
                              <React.Fragment key={group.key}>
                                {renderCells(orderToProfileRow(order), group.key, "order")}
                              </React.Fragment>
                            ))}
                            {canManageUsers && <TableCell className="border-l border-border" />}
                          </TableRow>
                        ))
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
