// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 4 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

/**
 * Bảng liên kết kênh × loại nguồn → idnguonkhachhang của Foxia.
 * Chỉ gọi mạng; điều phối (invalidate cache, toast, confirm) ở call site.
 */

/** Một HÀNG của bảng: một kênh bán nội bộ. */
export type FoxiaLinkRow = {
  id: number;
  channel_id: number;
  code: string;
  name: string;
  sort_order: number;
};

/** Một CỘT của bảng: loại nguồn cố định do BE quyết (landing/messenger/…). */
export type FoxiaLinkKind = {
  value: string;
  label: string;
};

export type FoxiaLinkCell = {
  link_channel_id: number;
  kind: string;
  foxia_source_id: number;
  source_name: string;
};

export type FoxiaLinkGrid = {
  channels: FoxiaLinkRow[];
  kinds: FoxiaLinkKind[];
  cells: FoxiaLinkCell[];
};

export type FoxiaLinkCellInput = {
  link_channel_id: number;
  kind: string;
  foxia_source_id: number | null;
};

const BASE = "/api/foxia/link-config";

export async function getLinkConfig(): Promise<FoxiaLinkGrid> {
  return (await fetchJson(BASE)) as FoxiaLinkGrid;
}

export async function addLinkChannels(channelIds: number[]): Promise<FoxiaLinkGrid> {
  return (await fetchJson(`${BASE}/channels`, {
    method: "POST",
    body: JSON.stringify({ channel_ids: channelIds }),
  })) as FoxiaLinkGrid;
}

export async function deleteLinkChannel(id: number): Promise<{ deleted_cells: number }> {
  return (await fetchJson(`${BASE}/channels/${id}`, { method: "DELETE" })) as {
    deleted_cells: number;
  };
}

export async function saveLinkCells(cells: FoxiaLinkCellInput[]): Promise<FoxiaLinkGrid> {
  return (await fetchJson(`${BASE}/cells`, {
    method: "PUT",
    body: JSON.stringify({ cells }),
  })) as FoxiaLinkGrid;
}
