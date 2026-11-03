export const foxiaLink = {
  "foxiaLink.title": "Foxia Link Configuration",
  "foxiaLink.description":
    "Each row is a sales channel, each column a customer-source type created in Foxia. A cell holds the Foxia customer-source id (idnguonkhachhang). Ingested landing/Lark orders are pushed to Foxia using the id in the column matching the order source (Landing, Messenger, Hotline, Zalo), with the product SKU in the message.",
  "foxiaLink.addChannel": "Add channel",
  "foxiaLink.save": "Save",
  "foxiaLink.pendingCount": "{count} cells pending",
  "foxiaLink.saved": "Foxia link configuration saved",
  "foxiaLink.saveFailed": "Save failed",
  "foxiaLink.removeChannel": "Remove channel",
  "foxiaLink.confirmRemoveChannel":
    'Remove channel "{name}" from the grid? {count} filled cells will be deleted.',
  "foxiaLink.removeChannelFailed": "Failed to remove channel",
  "foxiaLink.addChannelFailed": "Failed to add channel",
  "foxiaLink.empty": "No channels in the grid yet — add a channel to start.",
  "foxiaLink.columnChannel": "Sales channel",
  "foxiaLink.pickChannel": "Pick sales channels",
  "foxiaLink.search": "Search",
} as const;
