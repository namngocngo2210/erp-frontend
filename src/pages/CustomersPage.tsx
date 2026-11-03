import { DataTableShell } from "@/components/ui/data-table-shell";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { useI18n } from "@/i18n";

import type { CustomersPageProps } from "@/features/customers/customer-types";
import { useCustomersData } from "@/features/customers/use-customers-data";
import { CustomersToolbar } from "@/features/customers/components/CustomersToolbar";
import { CustomersTable } from "@/features/customers/components/CustomersTable";
import { CustomerCard } from "@/features/customers/components/CustomerCard";
import { CustomersPagination } from "@/features/customers/components/CustomersPagination";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";
import { CustomerDeleteDialogs } from "@/features/customers/components/CustomerDeleteDialogs";

function CustomersPage({ canManageUsers = false }: CustomersPageProps) {
  const { t } = useI18n();
  const data = useCustomersData(canManageUsers);

  const {
    searchTerm,
    setSearchTerm,
    segment,
    setSegment,
    channel,
    setChannel,
    salesStatus,
    setSalesStatus,
    segmentCategories,
    channelOptions,
    salesStatusOptions,
    visibleGroupOrder,
    toggleGroupVisibility,
    setColumnGroups,
    resetColumnGroups,
    selectedCustomerIds,
    toggleSelectRow,
    expandedId,
    ordersCache,
    ordersLoadingId,
    handleToggleExpand,
    handleOpenEdit,
    handleDelete,
    loading,
    profiles,
    total,
    currentPage,
    pageSize,
    totalPages,
    handlePageSizeChange,
    handlePageChange,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    formData,
    setFormData,
    formErrors,
    openCreateDialog,
    resetForm,
    handleCreate,
    handleUpdate,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    createCustomerMutation,
    updateCustomerMutation,
  } = data;

  return (
    <>
      <DataTableShell
        loading={loading && profiles.length === 0}
        toolbar={
          <CustomersToolbar
            canManageUsers={canManageUsers}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            segment={segment}
            onSegmentChange={setSegment}
            channel={channel}
            onChannelChange={setChannel}
            salesStatus={salesStatus}
            onSalesStatusChange={setSalesStatus}
            segmentCategories={segmentCategories}
            channelOptions={channelOptions}
            salesStatusOptions={salesStatusOptions}
            visibleGroupOrder={visibleGroupOrder}
            onToggleGroupVisibility={toggleGroupVisibility}
            onSetColumnGroups={setColumnGroups}
            onResetColumnGroups={resetColumnGroups}
            selectedCount={selectedCustomerIds.length}
            onBulkDelete={() => setBulkDeleteDialogOpen(true)}
            onCreate={openCreateDialog}
          />
        }
      >
        <ResponsiveList
          items={profiles}
          getKey={(profile) => profile.identity.id}
          loading={loading}
          loadingText={t("common.loading", "Đang tải…")}
          emptyText={t("customers.list.empty", "Chưa có khách hàng.")}
          table={<CustomersTable canManageUsers={canManageUsers} data={data} />}
          renderCard={(profile) => {
            const id = profile.identity.id;
            return (
              <CustomerCard
                profile={profile}
                canManageUsers={canManageUsers}
                selected={selectedCustomerIds.includes(id)}
                onToggleSelect={toggleSelectRow}
                isExpanded={expandedId === id}
                ordersLoading={ordersLoadingId === id}
                orders={ordersCache[id] || []}
                onToggleExpand={handleToggleExpand}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            );
          }}
        />

        {(profiles.length > 0 || currentPage > 1) && (
          <CustomersPagination
            total={total}
            pageSize={pageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={handlePageChange}
          />
        )}
      </DataTableShell>

      <CustomerFormDialog
        mode="create"
        idPrefix="create"
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetForm();
        }}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        isPending={createCustomerMutation.isPending}
        onSubmit={handleCreate}
        onCancel={() => setCreateDialogOpen(false)}
      />

      <CustomerFormDialog
        mode="edit"
        idPrefix="edit"
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetForm();
        }}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        isPending={updateCustomerMutation.isPending}
        onSubmit={handleUpdate}
        onCancel={() => setEditDialogOpen(false)}
      />

      <CustomerDeleteDialogs
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogOpenChange={setDeleteDialogOpen}
        onConfirmDelete={handleConfirmDelete}
        bulkDeleteDialogOpen={bulkDeleteDialogOpen}
        onBulkDeleteDialogOpenChange={setBulkDeleteDialogOpen}
        onConfirmBulkDelete={handleConfirmBulkDelete}
        selectedCount={selectedCustomerIds.length}
      />
    </>
  );
}

export default CustomersPage;
