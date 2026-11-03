import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicAssessmentFields } from "@/features/orders/DynamicAssessmentFields";
import { overlayPendingDynamicFieldValues } from "@/features/orders/dynamic-assessment-values";
import type { OrderCRMRow } from "@/features/orders/order-types";

const defs = [
  {
    code: "housing_type",
    label: "Loại nhà ở",
    kind: "single_choice" as const,
    options: [{ code: "apartment", label: "Chung cư" }],
    sort_order: 1,
  },
  {
    code: "family_context",
    label: "Hoàn cảnh gia đình",
    kind: "text" as const,
    options: [],
    sort_order: 2,
  },
];

describe("DynamicAssessmentFields", () => {
  it("renders one row per active def with current values", () => {
    render(
      <DynamicAssessmentFields
        defs={defs}
        values={{ housing_type: "apartment", family_context: "sống cùng con" }}
        onPatch={vi.fn()}
      />,
    );
    expect(screen.getByText("Loại nhà ở")).toBeInTheDocument();
    expect(screen.getByText("Chung cư")).toBeInTheDocument();
    expect(screen.getByText("Hoàn cảnh gia đình")).toBeInTheDocument();
    expect(screen.getByText("sống cùng con")).toBeInTheDocument();
  });

  it("shows raw code when option was removed from catalog", () => {
    render(
      <DynamicAssessmentFields defs={defs} values={{ housing_type: "villa" }} onPatch={vi.fn()} />,
    );
    expect(screen.getByText("villa")).toBeInTheDocument();
  });

  it("renders nothing when there is no def", () => {
    const { container } = render(
      <DynamicAssessmentFields defs={[]} values={{}} onPatch={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("overlayPendingDynamicFieldValues", () => {
  it("prefers a pending flat value over the stale extra_fields value", () => {
    const crm = {
      extra_fields: { housing_type: "apartment" },
      // Pending edit queued flat on crm (OrderDetailPage/Sheet3AssessmentPanel
      // deep-merge pendingRows.crm at top-level, not into extra_fields).
      housing_type: "villa",
    } as unknown as OrderCRMRow;

    const values = overlayPendingDynamicFieldValues(crm, [{ code: "housing_type" }]);

    expect(values.housing_type).toBe("villa");
  });

  it("falls back to extra_fields when there is no pending flat value", () => {
    const crm = {
      extra_fields: { housing_type: "apartment" },
    } as unknown as OrderCRMRow;

    const values = overlayPendingDynamicFieldValues(crm, [{ code: "housing_type" }]);

    expect(values.housing_type).toBe("apartment");
  });

  it("returns an empty object when crm is missing", () => {
    expect(overlayPendingDynamicFieldValues(null, [{ code: "housing_type" }])).toEqual({});
  });
});
