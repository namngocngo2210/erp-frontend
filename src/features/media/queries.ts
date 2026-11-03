/**
 * react-query hooks cho module Media, mirror các hàm gọi API trong
 * `@/lib/api/media`. Query key namespace `["media", ...]` để không đụng cache
 * của module khác.
 */
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createContent,
  createEvaluation,
  createProposal,
  createTaxonomy,
  deleteContent,
  deleteEvaluation,
  deleteProposal,
  deleteTaxonomy,
  duplicateContent,
  getContent,
  getContentQuality,
  getMediaMe,
  getMediaSettings,
  getRatingsByChannel,
  getReportOverview,
  importContentsExcel,
  listContents,
  listEvaluations,
  listProposals,
  listTaxonomy,
  requestVideoCache,
  TAXONOMY_GROUPS,
  testMediaSettings,
  updateEvaluation,
  updateMarketingInfo,
  updateMediaSettings,
  updateProposal,
  updateTaxonomy,
  updateUploadInfo,
  type ContentTagsPayload,
  type ContentUploadPayload,
  type EvaluationPayload,
  type MediaMe,
  type MediaTaxonomyItem,
  type ProposalPayload,
  type TaxonomyGroup,
  type TaxonomyPayload,
} from "@/lib/api/media";

export const mediaKeys = {
  all: ["media"] as const,
  me: ["media", "me"] as const,
  contents: (qs: string) => ["media", "contents", qs] as const,
  content: (id: number) => ["media", "content", id] as const,
  videoUrl: (id: number) => ["media", "video-url", id] as const,
  evaluations: (id: number) => ["media", "evaluations", id] as const,
  taxonomy: (group: TaxonomyGroup, inactive: boolean) =>
    ["media", "taxonomy", group, inactive] as const,
  proposals: (qs: string) => ["media", "proposals", qs] as const,
  report: (name: string, qs: string) => ["media", "report", name, qs] as const,
  settings: ["media", "settings"] as const,
};

export function useMediaMe() {
  return useQuery<MediaMe>({
    queryKey: mediaKeys.me,
    queryFn: ({ signal }) => getMediaMe(signal),
    staleTime: 60_000,
  });
}

export function useContents(sp: URLSearchParams) {
  const qs = sp.toString();
  return useQuery({
    queryKey: mediaKeys.contents(qs),
    queryFn: ({ signal }) => listContents(sp, signal),
    placeholderData: keepPreviousData,
  });
}

export function useContent(id: number | null) {
  return useQuery({
    queryKey: mediaKeys.content(id ?? 0),
    queryFn: ({ signal }) => getContent(id as number, signal),
    enabled: id != null,
  });
}

export function useEvaluations(contentId: number | null) {
  return useQuery({
    queryKey: mediaKeys.evaluations(contentId ?? 0),
    queryFn: ({ signal }) => listEvaluations(contentId as number, signal),
    enabled: contentId != null,
  });
}

export function useTaxonomy(group: TaxonomyGroup, includeInactive = false) {
  return useQuery({
    queryKey: mediaKeys.taxonomy(group, includeInactive),
    queryFn: ({ signal }) => listTaxonomy(group, includeInactive, signal),
    staleTime: 5 * 60_000,
  });
}

/** 5 danh mục cho ô lọc/tag; map theo group. */
export function useAllTaxonomy(): Record<TaxonomyGroup, MediaTaxonomyItem[]> {
  const results = useQueries({
    queries: TAXONOMY_GROUPS.map((group) => ({
      queryKey: mediaKeys.taxonomy(group, false),
      queryFn: ({ signal }: { signal?: AbortSignal }) => listTaxonomy(group, false, signal),
      staleTime: 5 * 60_000,
    })),
  });
  return Object.fromEntries(
    TAXONOMY_GROUPS.map((g, i) => [g, results[i].data?.items ?? []]),
  ) as Record<TaxonomyGroup, MediaTaxonomyItem[]>;
}

export function useProposals(sp: URLSearchParams) {
  const qs = sp.toString();
  return useQuery({
    queryKey: mediaKeys.proposals(qs),
    queryFn: ({ signal }) => listProposals(sp, signal),
    placeholderData: keepPreviousData,
  });
}

export function useReportOverview(sp: URLSearchParams) {
  return useQuery({
    queryKey: mediaKeys.report("overview", sp.toString()),
    queryFn: ({ signal }) => getReportOverview(sp, signal),
  });
}

export function useRatingsByChannel(sp: URLSearchParams) {
  return useQuery({
    queryKey: mediaKeys.report("ratings", sp.toString()),
    queryFn: ({ signal }) => getRatingsByChannel(sp, signal),
  });
}

export function useContentQuality(sp: URLSearchParams) {
  return useQuery({
    queryKey: mediaKeys.report("quality", sp.toString()),
    queryFn: ({ signal }) => getContentQuality(sp, signal),
  });
}

export function useMediaSettings() {
  return useQuery({
    queryKey: mediaKeys.settings,
    queryFn: ({ signal }) => getMediaSettings(signal),
  });
}

/** Lưu cấu hình Kết nối Media (base_url / shared_api_key / is_active). */
export function useUpdateMediaSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMediaSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mediaKeys.settings });
      void qc.invalidateQueries({ queryKey: mediaKeys.me });
    },
  });
}

/** Gọi thử kết nối ads-crm bằng key hiện tại (chung hoặc riêng). */
export function useTestMediaSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: testMediaSettings,
    onSuccess: () => void qc.invalidateQueries({ queryKey: mediaKeys.settings }),
  });
}

/** Invalidate danh sách + (nếu có id) chi tiết 1 nội dung sau khi ghi. */
function useInvalidateContents() {
  const qc = useQueryClient();
  return (id?: number) => {
    void qc.invalidateQueries({ queryKey: ["media", "contents"] });
    if (id) void qc.invalidateQueries({ queryKey: mediaKeys.content(id) });
  };
}

export function useCreateContent() {
  const inv = useInvalidateContents();
  return useMutation({ mutationFn: createContent, onSuccess: () => inv() });
}

export function useUpdateUploadInfo() {
  const inv = useInvalidateContents();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ContentUploadPayload }) =>
      updateUploadInfo(id, payload),
    onSuccess: (_, v) => inv(v.id),
  });
}

export function useUpdateMarketingInfo() {
  const inv = useInvalidateContents();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ContentTagsPayload }) =>
      updateMarketingInfo(id, payload),
    onSuccess: (_, v) => inv(v.id),
  });
}

/** Import Excel: 1 file → nhiều nội dung. Luôn invalidate vì có thể tạo được một
 * phần (dòng lỗi bị bỏ qua, dòng hợp lệ vẫn tạo). */
export function useImportContents() {
  const inv = useInvalidateContents();
  return useMutation({ mutationFn: importContentsExcel, onSuccess: () => inv() });
}

export function useDuplicateContent() {
  const inv = useInvalidateContents();
  return useMutation({ mutationFn: duplicateContent, onSuccess: () => inv() });
}

export function useDeleteContent() {
  const inv = useInvalidateContents();
  return useMutation({ mutationFn: deleteContent, onSuccess: (_, id) => inv(id) });
}

/** Yêu cầu tải/cache lại video (Task 21). `force` truyền qua tham số mutate. */
export function useRequestVideoCache(contentId: number) {
  const inv = useInvalidateContents();
  return useMutation({
    mutationFn: (force: boolean) => requestVideoCache(contentId, force),
    onSuccess: () => inv(contentId),
  });
}

/** Invalidate danh sách đánh giá + chi tiết + danh sách contents (overall_rating
 * do ads-crm tính lại mỗi khi thêm/sửa/xoá đánh giá). */
function useInvalidateEvaluations(contentId: number) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: mediaKeys.evaluations(contentId) });
    void qc.invalidateQueries({ queryKey: mediaKeys.content(contentId) });
    void qc.invalidateQueries({ queryKey: ["media", "contents"] });
  };
}

export function useCreateEvaluation(contentId: number) {
  const inv = useInvalidateEvaluations(contentId);
  return useMutation({
    mutationFn: (payload: EvaluationPayload) => createEvaluation(contentId, payload),
    onSuccess: inv,
  });
}

export function useUpdateEvaluation(contentId: number) {
  const inv = useInvalidateEvaluations(contentId);
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: EvaluationPayload }) =>
      updateEvaluation(id, payload),
    onSuccess: inv,
  });
}

export function useDeleteEvaluation(contentId: number) {
  const inv = useInvalidateEvaluations(contentId);
  return useMutation({ mutationFn: deleteEvaluation, onSuccess: inv });
}

/** Invalidate danh sách đề xuất (mọi filter) sau khi tạo/sửa/xoá. */
function useInvalidateProposals() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["media", "proposals"] });
}

export function useCreateProposal() {
  const inv = useInvalidateProposals();
  return useMutation({ mutationFn: createProposal, onSuccess: inv });
}

export function useUpdateProposal() {
  const inv = useInvalidateProposals();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ProposalPayload }) =>
      updateProposal(id, payload),
    onSuccess: inv,
  });
}

export function useDeleteProposal() {
  const inv = useInvalidateProposals();
  return useMutation({ mutationFn: deleteProposal, onSuccess: inv });
}

/** Invalidate mọi biến thể (include_inactive true/false) của 1 group sau khi ghi. */
function useInvalidateTaxonomy(group: TaxonomyGroup) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["media", "taxonomy", group] });
}

export function useCreateTaxonomy(group: TaxonomyGroup) {
  const inv = useInvalidateTaxonomy(group);
  return useMutation({
    mutationFn: (payload: TaxonomyPayload) => createTaxonomy(group, payload),
    onSuccess: inv,
  });
}

export function useUpdateTaxonomy(group: TaxonomyGroup) {
  const inv = useInvalidateTaxonomy(group);
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TaxonomyPayload }) =>
      updateTaxonomy(group, id, payload),
    onSuccess: inv,
  });
}

export function useDeleteTaxonomy(group: TaxonomyGroup) {
  const inv = useInvalidateTaxonomy(group);
  return useMutation({ mutationFn: (id: number) => deleteTaxonomy(group, id), onSuccess: inv });
}
