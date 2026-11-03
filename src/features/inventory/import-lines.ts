import { fetchJson, getValidAccessToken } from "@/services/http";

export type ImportLine = {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  condition_note: string;
};

export type ImportResult = {
  lines: ImportLine[];
  errors: { row: number; sku: string; message: string }[];
};

export async function parseImportLines(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return fetchJson("/api/inventory/import/parse-lines", {
    method: "POST",
    body: form,
  }) as Promise<ImportResult>;
}

export async function downloadLinesTemplate(): Promise<void> {
  let token: string | null = null;
  try {
    token = await getValidAccessToken();
  } catch {
    token = null;
  }

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // eslint-disable-next-line no-restricted-globals -- blob download (template file); fetchJson only handles JSON responses
  const response = await fetch("/api/inventory/import/template", {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error("Không thể tải file mẫu.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "inventory-import-template.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
