import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { AlertTriangle } from "lucide-react";

// Tailwind v4: import CSS gốc của xyflow ngay trong component — Vite xử lý
// như module CSS thường, CSS này KHÔNG nằm trong @layer nên luôn thắng
// utilities (xem memory tailwind4-unlayered-css-gotcha — ở đây là điều
// MONG MUỐN, style cạnh/canvas mặc định của xyflow phải giữ nguyên).
import "@xyflow/react/dist/style.css";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { buildFlowGraph, NODE_HEIGHT, NODE_WIDTH, type FlowNodeData } from "../flow-graph";
import { useResults, useStages, useTransitions } from "../queries";

const ALL_RESULTS_VALUE = "all";

/** Node đơn giản: nền = màu stage, badge ▶ khi là bước bắt đầu, mờ khi đã tắt. */
function FlowStageNode({ data, selected }: NodeProps & { data: FlowNodeData }) {
  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: data.color,
        opacity: data.isActive ? 1 : 0.5,
      }}
      className={
        "flex h-full w-full items-center justify-center rounded-lg border-2 px-3 text-center text-sm font-medium text-white shadow-sm " +
        (selected ? "border-foreground" : "border-transparent")
      }
    >
      <Handle type="target" position={Position.Left} className="!bg-white/80" />
      {data.isStart ? <span className="mr-1.5 shrink-0">▶</span> : null}
      <span className="truncate drop-shadow-sm">{data.label}</span>
      <Handle type="source" position={Position.Right} className="!bg-white/80" />
    </div>
  );
}

const nodeTypes: NodeTypes = { flowStage: FlowStageNode };

/**
 * Tab "Sơ đồ" — trực quan hoá flow tác nghiệp (Stage → Transition → Stage)
 * bằng @xyflow/react, layout tự động qua dagre (đã tính sẵn ở `flow-graph.ts`).
 * Lọc theo kết quả liên hệ, click node để soi cạnh vào/ra, và luôn hiện cảnh
 * báo cấu hình (ngõ cụt / không thể tới / thiếu-hoặc-thừa bước bắt đầu).
 */
export function FlowDiagramTab() {
  const { data: stages = [], isLoading: stagesLoading, isError: stagesError } = useStages();
  const {
    data: transitions = [],
    isLoading: transitionsLoading,
    isError: transitionsError,
  } = useTransitions();
  const { data: results = [] } = useResults();

  const [resultFilter, setResultFilter] = useState<string>(ALL_RESULTS_VALUE);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const resultId = resultFilter === ALL_RESULTS_VALUE ? undefined : Number(resultFilter);

  const graph = useMemo(
    () => buildFlowGraph(stages, transitions, resultId != null ? { resultId } : undefined),
    [stages, transitions, resultId],
  );

  const displayEdges = useMemo(
    () =>
      graph.edges.map((edge) => {
        const highlighted =
          selectedNodeId != null &&
          (edge.source === selectedNodeId || edge.target === selectedNodeId);
        return {
          ...edge,
          style: {
            strokeWidth: highlighted ? 3 : 1.5,
            stroke: highlighted ? "var(--color-primary)" : "var(--color-muted-foreground)",
          },
          labelStyle: { fill: "var(--color-foreground)", fontSize: 11 },
          zIndex: highlighted ? 1 : 0,
        };
      }),
    [graph.edges, selectedNodeId],
  );

  const displayNodes = useMemo(
    () => graph.nodes.map((node) => ({ ...node, selected: node.id === selectedNodeId })),
    [graph.nodes, selectedNodeId],
  );

  const resultOptions = useMemo(
    () => [
      { value: ALL_RESULTS_VALUE, label: "Tất cả kết quả" },
      ...results.map((r) => ({ value: String(r.id), label: r.name })),
    ],
    [results],
  );

  const handleNodeClick = useCallback((_event: unknown, node: { id: string }) => {
    setSelectedNodeId((current) => (current === node.id ? null : node.id));
  }, []);

  const isLoading = stagesLoading || transitionsLoading;
  const isError = stagesError || transitionsError;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <LogoSpinner label="Đang tải" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-sm text-destructive">
        Không tải được dữ liệu sơ đồ flow.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <SearchableSelect
          options={resultOptions}
          value={resultFilter}
          onChange={setResultFilter}
          className="w-64"
          placeholder="Tất cả kết quả"
        />
        {selectedNodeId ? (
          <span className="text-xs text-muted-foreground">
            Đang soi cạnh của 1 bước — bấm lại vào node để bỏ chọn.
          </span>
        ) : null}
      </div>

      {graph.warnings.length > 0 ? (
        <div className="space-y-1.5 rounded-md border border-destructive/20 bg-destructive/5 p-3">
          {graph.warnings.map((w, idx) => (
            <div
              key={`${w.kind}-${w.stageName ?? idx}`}
              className="flex items-start gap-2 text-xs text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* React Flow cần parent có chiều cao THẬT: shell content là vùng cuộn
          auto-height nên chuỗi h-full/flex-1 có thể sập về 0 → canvas trắng
          trơn (bug 19/07). min-h làm sàn đảm bảo luôn nhìn thấy sơ đồ. */}
      <div className="min-h-120 flex-1 overflow-hidden rounded-lg border border-border">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
