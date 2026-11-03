import { describe, expect, it } from "vitest";

import { MEDIA_ACTIONS, mediaCan, type MediaAction, type MediaRole } from "@/features/media/access";

const VIEWER: MediaAction[] = ["read", "proposal.create", "proposal.edit"];
const MARKETING: MediaAction[] = [...VIEWER, "content.edit_marketing", "evaluation.write"];
const UPLOADER: MediaAction[] = [
  ...VIEWER,
  "content.create",
  "content.edit_upload",
  "content.edit_marketing",
  "taxonomy.write_sources",
];
const EXPECTED: Record<MediaRole, readonly MediaAction[]> = {
  viewer: VIEWER,
  marketing: MARKETING,
  uploader: UPLOADER,
  admin: MEDIA_ACTIONS,
};

describe("mediaCan", () => {
  it("khớp ma trận §5.2 cho 4 role × mọi action", () => {
    for (const role of Object.keys(EXPECTED) as MediaRole[]) {
      for (const action of MEDIA_ACTIONS) {
        expect(mediaCan(role, action), `${role}/${action}`).toBe(EXPECTED[role].includes(action));
      }
    }
  });
  it("role rỗng/null → không có quyền gì", () => {
    expect(mediaCan(null, "read")).toBe(false);
    expect(mediaCan(undefined, "read")).toBe(false);
  });
});
