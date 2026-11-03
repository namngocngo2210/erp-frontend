import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/http", () => ({ fetchJson: vi.fn() }));
import { fetchJson } from "@/services/http";
import {
  getKiotVietLocationData,
  parseAddress,
  getCrmCatalogs,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrders,
  deleteOrder,
} from "@/lib/api/orders";

const mockFetchJson = fetchJson as ReturnType<typeof vi.fn>;

describe("orders api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getKiotVietLocationData calls the location-data endpoint", async () => {
    mockFetchJson.mockResolvedValue({ "Hà Nội": ["Ba Đình"] });
    const res = await getKiotVietLocationData();
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/kiotviet-location-data");
    expect(res).toEqual({ "Hà Nội": ["Ba Đình"] });
  });

  it("getCrmCatalogs calls the crm-catalogs endpoint", async () => {
    mockFetchJson.mockResolvedValue({ sales_status_options: [] });
    const res = await getCrmCatalogs<{ sales_status_options: unknown[] }>();
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/crm-catalogs");
    expect(res).toEqual({ sales_status_options: [] });
  });

  it("getOrder fetches a single order by id", async () => {
    mockFetchJson.mockResolvedValue({ id: 7 });
    const res = await getOrder(7);
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/7");
    expect(res).toEqual({ id: 7 });
  });

  it("parseAddress posts the raw address", async () => {
    mockFetchJson.mockResolvedValue({ address: "123" });
    const res = await parseAddress("123 Main St");
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/parse-address", {
      method: "POST",
      body: JSON.stringify({ raw_address: "123 Main St" }),
    });
    expect(res).toEqual({ address: "123" });
  });

  it("createOrder posts to the create endpoint with the payload", async () => {
    mockFetchJson.mockResolvedValue({ id: 1 });
    const payload = { channel_code: "C1", name: "A", phone: "0900" };
    const res = await createOrder(payload);
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    expect(res).toEqual({ id: 1 });
  });

  it("updateOrder patches the order endpoint", async () => {
    mockFetchJson.mockResolvedValue({ id: 5, status: 3 });
    const res = await updateOrder(5, { status: 3 });
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/5", {
      method: "PATCH",
      body: JSON.stringify({ status: 3 }),
    });
    expect(res).toEqual({ id: 5, status: 3 });
  });

  it("deleteOrders posts ids to bulk-delete", async () => {
    mockFetchJson.mockResolvedValue({ deleted_count: 2 });
    const res = await deleteOrders([1, 2]);
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids: [1, 2] }),
    });
    expect(res).toEqual({ deleted_count: 2 });
  });

  it("deleteOrder posts a single-id array to bulk-delete", async () => {
    mockFetchJson.mockResolvedValue({ deleted_count: 1 });
    await deleteOrder(9);
    expect(mockFetchJson).toHaveBeenCalledWith("/api/orders/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids: [9] }),
    });
  });
});
