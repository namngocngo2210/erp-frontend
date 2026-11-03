import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createResult,
  createStage,
  createTransition,
  deleteTransition,
  getResults,
  getStages,
  getTransitions,
  importFlowFile,
  updateResult,
  updateStage,
  updateTransition,
  type FlowResult,
  type FlowStage,
  type FlowTransition,
} from "@/lib/api/contact-flow";

export const flowKeys = {
  all: ["contact-flow"] as const,
  stages: ["contact-flow", "stages"] as const,
  results: ["contact-flow", "results"] as const,
  transitions: ["contact-flow", "transitions"] as const,
};

/** GET /api/contact-flow/stages — danh sách trạng thái tác nghiệp. */
export function useStages() {
  return useQuery({ queryKey: flowKeys.stages, queryFn: getStages });
}

/** GET /api/contact-flow/results — danh sách kết quả liên hệ. */
export function useResults() {
  return useQuery({ queryKey: flowKeys.results, queryFn: getResults });
}

/** GET /api/contact-flow/transitions — cấu hình chuyển trạng thái theo kết quả. */
export function useTransitions() {
  return useQuery({ queryKey: flowKeys.transitions, queryFn: getTransitions });
}

export function useCreateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<FlowStage>) => createStage(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.stages });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<FlowStage> }) => updateStage(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.stages });
    },
  });
}

export function useCreateResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<FlowResult>) => createResult(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.results });
    },
  });
}

export function useUpdateResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<FlowResult> }) => updateResult(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.results });
    },
  });
}

export function useCreateTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<FlowTransition>) => createTransition(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.transitions });
    },
  });
}

export function useUpdateTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<FlowTransition> }) =>
      updateTransition(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.transitions });
    },
  });
}

export function useDeleteTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTransition(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.transitions });
    },
  });
}

/** POST /api/contact-flow/import — nhập Excel cấu hình tác nghiệp, ảnh hưởng cả 3 danh mục. */
export function useImportFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importFlowFile(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flowKeys.stages });
      void qc.invalidateQueries({ queryKey: flowKeys.results });
      void qc.invalidateQueries({ queryKey: flowKeys.transitions });
    },
  });
}
