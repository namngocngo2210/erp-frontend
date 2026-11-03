import dagre from "@dagrejs/dagre";
import type { Edge, Node, Position } from "@xyflow/react";

import type { FlowStage, FlowTransition } from "@/lib/api/contact-flow";
import { formatDelay } from "./delay-utils";

/**
 * Module thuần TS (không import React) dựng graph cho tab "Sơ đồ" từ dữ liệu
 * Stage/Transition đã tải qua React Query — component chỉ gọi buildFlowGraph
 * và render, mọi logic (id, label, layout, cảnh báo cấu hình) nằm ở đây để
 * test được độc lập với DOM.
 */

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 56;

export type FlowNodeData = {
  label: string;
  color: string;
  isStart: boolean;
  isActive: boolean;
  /** undefined cho node ảo "Kết thúc". */
  stageId?: number;
  isEnd?: boolean;
};

export type FlowEdgeData = {
  resultId: number;
};

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge<FlowEdgeData>;

export type FlowWarning = {
  kind: "dead_end" | "unreachable" | "no_start" | "multi_start";
  stageName?: string;
  message: string;
};

const DEFAULT_STAGE_COLOR = "#94a3b8";
const END_NODE_COLOR = "#64748b";

/** `is_active` vắng mặt (undefined) coi như đang hoạt động — khớp mặc định BE. */
function isActiveStage(stage: FlowStage): boolean {
  return stage.is_active !== false;
}

function isStartStage(stage: FlowStage): boolean {
  return Boolean(stage.is_start) && isActiveStage(stage);
}

function endNodeId(fromStageId: number): string {
  return `end:${fromStageId}`;
}

export function stageNodeId(stageId: number): string {
  return `stage:${stageId}`;
}

/**
 * Dựng {nodes, edges, warnings} cho tab Sơ đồ.
 *
 * - `warnings` LUÔN tính trên toàn bộ `stages`/`transitions` (bất kể
 *   `opts.resultId`) vì đó là cảnh báo cấu hình, không phải view hiện tại.
 * - `opts.resultId` chỉ lọc `edges` hiển thị (và theo đó là các node ảo
 *   "Kết thúc" chỉ sinh ra từ transition thuộc kết quả đang lọc); toàn bộ
 *   stage vẫn hiện đủ để không "biến mất" khỏi sơ đồ khi đổi bộ lọc.
 */
export function buildFlowGraph(
  stages: FlowStage[],
  transitions: FlowTransition[],
  opts?: { resultId?: number },
): { nodes: FlowNode[]; edges: FlowEdge[]; warnings: FlowWarning[] } {
  const visibleTransitions =
    opts?.resultId != null ? transitions.filter((t) => t.result_id === opts.resultId) : transitions;

  const stageNodes: FlowNode[] = stages.map((stage) => ({
    id: stageNodeId(stage.id),
    type: "flowStage",
    position: { x: 0, y: 0 },
    sourcePosition: "right" as Position,
    targetPosition: "left" as Position,
    data: {
      label: stage.name,
      color: stage.color || DEFAULT_STAGE_COLOR,
      isStart: isStartStage(stage),
      isActive: isActiveStage(stage),
      stageId: stage.id,
    },
  }));

  const endNodeIds = new Set<string>();
  const edges: FlowEdge[] = [];

  for (const t of visibleTransitions) {
    const source = stageNodeId(t.from_stage_id);
    const target = t.to_stage_id != null ? stageNodeId(t.to_stage_id) : endNodeId(t.from_stage_id);
    if (t.to_stage_id == null) endNodeIds.add(target);

    edges.push({
      id: `t:${t.id}`,
      source,
      target,
      label: `${t.result_name} · ${formatDelay(t.delay_minutes)}`,
      data: { resultId: t.result_id },
    });
  }

  const endNodes: FlowNode[] = Array.from(endNodeIds).map((id) => ({
    id,
    type: "flowStage",
    position: { x: 0, y: 0 },
    sourcePosition: "right" as Position,
    targetPosition: "left" as Position,
    data: {
      label: "Kết thúc",
      color: END_NODE_COLOR,
      isStart: false,
      isActive: true,
      isEnd: true,
    },
  }));

  const nodes = [...stageNodes, ...endNodes];
  layoutNodes(nodes, edges);

  return { nodes, edges, warnings: buildWarnings(stages, transitions) };
}

/** Cảnh báo cấu hình — luôn tính trên toàn bộ dữ liệu (không lọc theo kết quả). */
function buildWarnings(stages: FlowStage[], transitions: FlowTransition[]): FlowWarning[] {
  const outDegree = new Map<number, number>();
  const inDegree = new Map<number, number>();
  for (const t of transitions) {
    outDegree.set(t.from_stage_id, (outDegree.get(t.from_stage_id) ?? 0) + 1);
    if (t.to_stage_id != null) {
      inDegree.set(t.to_stage_id, (inDegree.get(t.to_stage_id) ?? 0) + 1);
    }
  }

  const warnings: FlowWarning[] = [];
  const activeStages = stages.filter(isActiveStage);
  const startStages = activeStages.filter((s) => s.is_start);

  if (startStages.length === 0) {
    warnings.push({
      kind: "no_start",
      message: "Chưa có bước bắt đầu (is_start) nào đang hoạt động.",
    });
  } else if (startStages.length > 1) {
    warnings.push({
      kind: "multi_start",
      message: `Có ${startStages.length} bước bắt đầu đang hoạt động: ${startStages
        .map((s) => s.name)
        .join(", ")}.`,
    });
  }

  for (const stage of activeStages) {
    if (stage.is_start) continue;
    if ((outDegree.get(stage.id) ?? 0) === 0) {
      warnings.push({
        kind: "dead_end",
        stageName: stage.name,
        message: `"${stage.name}" là ngõ cụt: không có bước chuyển tiếp nào đi ra.`,
      });
    }
    if ((inDegree.get(stage.id) ?? 0) === 0) {
      warnings.push({
        kind: "unreachable",
        stageName: stage.name,
        message: `"${stage.name}" không có bước chuyển tiếp nào trỏ tới, không thể tới được.`,
      });
    }
  }

  return warnings;
}

/** Layout LR bằng dagre, gán position (góc trên-trái) cho từng node — mutate tại chỗ. */
function layoutNodes(nodes: FlowNode[], edges: FlowEdge[]): void {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  for (const n of nodes) {
    const pos = g.node(n.id);
    if (pos) {
      n.position = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
    }
  }
}
