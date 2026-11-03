import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChannelManageDialog } from "@/features/channels/ChannelManageDialog";
import { renderWithI18n } from "@/test/render-with-i18n";

// Cùng bộ dữ liệu với test thuần groupAdAccountOptions: 3 dòng DB (21, 64, 172) đều
// là bản sao của cùng một TKQC thật (account_id 25322428374101900), 21 là PK nhỏ
// nhất nên là đại diện. Điểm mấu chốt của test này: kênh đang lưu PK 172 — MỘT BẢN
// SAO KHÔNG PHẢI ĐẠI DIỆN — mô phỏng đúng thực trạng prod nêu trong task brief, nơi
// kênh có thể trỏ vào bất kỳ dòng nào trong nhóm trùng.
const DUPLICATE_FB_ACCOUNTS = [
  { id: 21, name: "LỢI_TK7_HKD", account_id: "25322428374101900" },
  { id: 172, name: "LỢI_TK7_HKD", account_id: "25322428374101900" },
  { id: 64, name: "LỢI_TK7_HKD", account_id: "25322428374101900" },
  { id: 30, name: "Lợi_TK6_HKD", account_id: "2007931173486188" },
];

function renderManageDialog(
  editFbAdsAccounts: number[],
  onEditFbAdsAccountsChange: (value: number[]) => void = vi.fn(),
) {
  renderWithI18n(
    <ChannelManageDialog
      open
      manageRow={{
        id: 1,
        code: "HN01",
        name: "Kênh Hà Nội",
        owner: "",
        landingpage_source: [],
        fb_ads_accounts: editFbAdsAccounts,
        google_ads_accounts: [],
        is_active: true,
        created_at: "2026-08-01T00:00:00Z",
        assigned_user_count: 0,
        assigned_users: [],
        kiotviet_mappings: [],
      }}
      editName="Kênh Hà Nội"
      editOwner=""
      editLandingpageSource=""
      editStatus="true"
      editKiotvietMappings={[]}
      editFbAdsAccounts={editFbAdsAccounts}
      editGoogleAdsAccounts={[]}
      editPriceBookId={null}
      editChannelTypeId={null}
      savingInfo={false}
      assignedUsers={[]}
      assignableStaff={[]}
      selectedAssignmentUserId={null}
      isAssigning={false}
      availableFbAdsAccounts={DUPLICATE_FB_ACCOUNTS}
      availableGoogleAdsAccounts={[]}
      priceBooks={[]}
      channelTypes={[]}
      kiotvietChannels={[]}
      onOpenChange={vi.fn()}
      onEditNameChange={vi.fn()}
      onEditOwnerChange={vi.fn()}
      onEditLandingpageSourceChange={vi.fn()}
      onEditStatusChange={vi.fn()}
      onEditKiotvietMappingsChange={vi.fn()}
      onEditFbAdsAccountsChange={onEditFbAdsAccountsChange}
      onEditGoogleAdsAccountsChange={vi.fn()}
      onEditPriceBookIdChange={vi.fn()}
      onEditChannelTypeIdChange={vi.fn()}
      onSaveInfo={vi.fn()}
      onSelectedAssignmentUserIdChange={vi.fn()}
      onAddAssignments={vi.fn()}
      onRemoveAssignment={vi.fn()}
    />,
  );
}

afterEach(cleanup);

describe("ChannelManageDialog — chip TKQC không biến mất khi kênh trỏ bản sao không phải đại diện", () => {
  it("kênh lưu PK 172 (không phải đại diện 21) → chip nhóm TKQC vẫn hiện", () => {
    // Nếu phép kiểm tra "đang chọn" bị viết lại thành so value === PK đã lưu
    // (editFbAdsAccounts.includes(Number(opt.value))) thay vì hỏi cả nhóm ids, chip
    // này sẽ biến mất vì value của option đại diện là "21", không phải "172".
    renderManageDialog([172]);

    expect(screen.getByText("LỢI_TK7_HKD (25322428374101900)")).toBeInTheDocument();
  });
});

describe("ChannelManageDialog — lưu lại không được ghi đè PK đã lưu bằng PK đại diện (Việc 1)", () => {
  // Kịch bản prod thật: kênh đang lưu PK 172 (bản app 4, ĐANG CÓ chi tiêu). Trước
  // khi sửa, `fbAdsValue` gán value="21" (đại diện, PK nhỏ nhất) cho chip này —
  // chọn thêm một nhóm TKQC khác sẽ khiến react-select trả nguyên object trong
  // "value" (đã bị đổi value="21") qua onChange, âm thầm thay 172 bằng 21 dù
  // người dùng không hề đụng vào chip đó. Test này khoá: PK gửi lên onChange
  // phải VẪN LÀ 172, không bị đổi thành 21.
  it("thêm một TKQC khác vào lựa chọn → PK 172 đang lưu vẫn được giữ nguyên, không bị đổi thành PK đại diện 21", async () => {
    const user = userEvent.setup();
    const onEditFbAdsAccountsChange = vi.fn();
    renderManageDialog([172], onEditFbAdsAccountsChange);

    const combobox = screen.getByLabelText("Tài khoản quảng cáo Facebook");
    await user.click(combobox);
    const otherAccountOption = await screen.findByRole("option", {
      name: "Lợi_TK6_HKD (2007931173486188)",
    });
    await user.click(otherAccountOption);

    expect(onEditFbAdsAccountsChange).toHaveBeenCalledTimes(1);
    const sentIds = onEditFbAdsAccountsChange.mock.calls[0][0] as number[];
    expect(sentIds).toEqual(expect.arrayContaining([172, 30]));
    expect(sentIds).not.toContain(21);
  });
});
