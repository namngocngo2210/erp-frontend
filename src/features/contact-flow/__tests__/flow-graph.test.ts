import { describe, expect, it } from "vitest";

import type { FlowStage, FlowTransition } from "@/lib/api/contact-flow";
import { buildFlowGraph } from "../flow-graph";

/**
 * Fixture nhỏ mô phỏng flow tác nghiệp thật:
 * 1 Mới (start) --KNM / TB(30 phút)--> 2 Đang chăm sóc
 * 2 Đang chăm sóc --Chốt(60 phút)--> 3 Chốt đơn
 * 2 Đang chăm sóc --Huỷ(?)--> (kết thúc, to_stage null)
 * 6 Nhắc lại --Nhắc lại KH(10 ngày)--> 3 Chốt đơn   (6 không ai trỏ tới → unreachable)
 * 3 Chốt đơn --Không nghe máy--> 4 Ngừng CS          (4 không có transitions_out → dead_end)
 * 5 Đã tắt: is_active=false, không is_start, không ai trỏ tới/không trỏ đi đâu — KHÔNG cảnh báo (đã tắt).
 */
const stages: FlowStage[] = [
  { id: 1, name: "Mới", color: "#3b82f6", is_start: true, is_active: true },
  { id: 2, name: "Đang chăm sóc", color: "#f59e0b", is_start: false, is_active: true },
  { id: 3, name: "Chốt đơn", color: "#10b981", is_start: false, is_active: true },
  { id: 4, name: "Ngừng CS", color: "#ef4444", is_start: false, is_active: true },
  { id: 5, name: "Đã tắt", color: "#94a3b8", is_start: false, is_active: false },
  { id: 6, name: "Nhắc lại", color: "#8b5cf6", is_start: false, is_active: true },
];

const transitions: FlowTransition[] = [
  {
    id: 10,
    from_stage_id: 1,
    from_stage_name: "Mới",
    result_id: 100,
    result_name: "KNM / TB",
    to_stage_id: 2,
    to_stage_name: "Đang chăm sóc",
    delay_minutes: 30,
  },
  {
    id: 11,
    from_stage_id: 2,
    from_stage_name: "Đang chăm sóc",
    result_id: 101,
    result_name: "Chốt",
    to_stage_id: 3,
    to_stage_name: "Chốt đơn",
    delay_minutes: 60,
  },
  {
    id: 12,
    from_stage_id: 2,
    from_stage_name: "Đang chăm sóc",
    result_id: 102,
    result_name: "Huỷ",
    to_stage_id: null,
    to_stage_name: null,
    delay_minutes: null,
  },
  {
    id: 13,
    from_stage_id: 6,
    from_stage_name: "Nhắc lại",
    result_id: 103,
    result_name: "Nhắc lại KH",
    to_stage_id: 3,
    to_stage_name: "Chốt đơn",
    delay_minutes: 14400,
  },
  {
    id: 14,
    from_stage_id: 3,
    from_stage_name: "Chốt đơn",
    result_id: 104,
    result_name: "Không nghe máy",
    to_stage_id: 4,
    to_stage_name: "Ngừng CS",
    delay_minutes: null,
  },
];

describe("buildFlowGraph", () => {
  it("(a) sinh đủ node: 6 stage + 1 node ảo kết thúc (end:2)", () => {
    const { nodes } = buildFlowGraph(stages, transitions);
    expect(nodes).toHaveLength(7);
    const ids = nodes.map((n) => n.id);
    for (const s of stages) expect(ids).toContain(`stage:${s.id}`);
    expect(ids).toContain("end:2");
  });

  it("(a) mỗi node có toạ độ hữu hạn do dagre layout gán", () => {
    const { nodes } = buildFlowGraph(stages, transitions);
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
  });

  it("(b) label cạnh ghép '<kết quả> · <thời gian>'", () => {
    const { edges } = buildFlowGraph(stages, transitions);
    const e10 = edges.find((e) => e.id === "t:10");
    expect(e10?.label).toBe("KNM / TB · 30 phút");
    const e11 = edges.find((e) => e.id === "t:11");
    expect(e11?.label).toBe("Chốt · 1 giờ");
    const e13 = edges.find((e) => e.id === "t:13");
    expect(e13?.label).toBe("Nhắc lại KH · 10 ngày");
  });

  it("(c) dead_end: stage active, không is_start, không có transitions_out", () => {
    const { warnings } = buildFlowGraph(stages, transitions);
    const deadEnds = warnings.filter((w) => w.kind === "dead_end");
    expect(deadEnds).toHaveLength(1);
    expect(deadEnds[0].stageName).toBe("Ngừng CS");
  });

  it("(c) unreachable: stage active, không is_start, không ai trỏ tới", () => {
    const { warnings } = buildFlowGraph(stages, transitions);
    const unreachable = warnings.filter((w) => w.kind === "unreachable");
    expect(unreachable).toHaveLength(1);
    expect(unreachable[0].stageName).toBe("Nhắc lại");
  });

  it("(c) stage is_active=false không sinh cảnh báo dead_end/unreachable", () => {
    const { warnings } = buildFlowGraph(stages, transitions);
    expect(warnings.some((w) => w.stageName === "Đã tắt")).toBe(false);
  });

  it("(c) no_start: 0 stage active is_start", () => {
    const noStartStages: FlowStage[] = stages.map((s) => ({ ...s, is_start: false }));
    const { warnings } = buildFlowGraph(noStartStages, transitions);
    expect(warnings.some((w) => w.kind === "no_start")).toBe(true);
    expect(warnings.some((w) => w.kind === "multi_start")).toBe(false);
  });

  it("(c) multi_start: >1 stage active is_start", () => {
    const multiStartStages: FlowStage[] = stages.map((s) =>
      s.id === 1 || s.id === 2 ? { ...s, is_start: true } : s,
    );
    const { warnings } = buildFlowGraph(multiStartStages, transitions);
    expect(warnings.some((w) => w.kind === "multi_start")).toBe(true);
    expect(warnings.some((w) => w.kind === "no_start")).toBe(false);
  });

  it("(d) filter resultId chỉ giữ cạnh của kết quả đó", () => {
    const { edges } = buildFlowGraph(stages, transitions, { resultId: 101 });
    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe("t:11");
  });

  it("(d) resultId filter không ảnh hưởng warnings (tính trên toàn bộ cấu hình)", () => {
    const { warnings } = buildFlowGraph(stages, transitions, { resultId: 101 });
    expect(warnings.filter((w) => w.kind === "dead_end")).toHaveLength(1);
    expect(warnings.filter((w) => w.kind === "unreachable")).toHaveLength(1);
  });

  it("(e) to_stage null sinh node ảo end:<from> label 'Kết thúc'", () => {
    const { nodes, edges } = buildFlowGraph(stages, transitions);
    const endNode = nodes.find((n) => n.id === "end:2");
    expect(endNode).toBeDefined();
    expect(endNode?.data.label).toBe("Kết thúc");
    const e12 = edges.find((e) => e.id === "t:12");
    expect(e12?.target).toBe("end:2");
    expect(e12?.source).toBe("stage:2");
  });
});
