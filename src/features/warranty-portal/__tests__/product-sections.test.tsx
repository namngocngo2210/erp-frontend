import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AudienceNote } from "../components/product/AudienceNote";
import { CompanyFooter } from "../components/product/CompanyFooter";
import { FaqAccordion } from "../components/product/FaqAccordion";
import { HighlightList } from "../components/product/HighlightList";
import { ProductGallery } from "../components/product/ProductGallery";
import { SpecTable } from "../components/product/SpecTable";
import { TroubleshootTable } from "../components/product/TroubleshootTable";
import { UsageSteps } from "../components/product/UsageSteps";
import { VideoLinks } from "../components/product/VideoLinks";

describe("khối rỗng thì ẩn hẳn", () => {
  it.each([
    ["HighlightList", <HighlightList items={[]} key="h" />],
    ["SpecTable", <SpecTable items={[]} key="s" />],
    ["UsageSteps", <UsageSteps items={[]} key="u" />],
    ["TroubleshootTable", <TroubleshootTable items={[]} key="t" />],
    ["FaqAccordion", <FaqAccordion items={[]} key="f" />],
    ["VideoLinks", <VideoLinks items={[]} key="v" />],
    ["AudienceNote", <AudienceNote audience={{}} key="a" />],
    ["ProductGallery", <ProductGallery images={[]} key="g" />],
  ])("%s không render tiêu đề rỗng", (_name, element) => {
    const { container } = render(element);
    expect(container).toBeEmptyDOMElement();
  });
});

it("SpecTable hiện đủ nhãn và giá trị", () => {
  render(<SpecTable items={[{ label: "Công suất", value: "800W" }]} />);

  expect(screen.getByText("Công suất")).toBeInTheDocument();
  expect(screen.getByText("800W")).toBeInTheDocument();
});

it("AudienceNote tách hai nhóm nên dùng và cần hỏi bác sĩ", () => {
  render(
    <AudienceNote audience={{ suitable: ["Người đau mỏi chân"], caution: ["Phụ nữ mang thai"] }} />,
  );

  expect(screen.getByText(/Người đau mỏi chân/)).toBeInTheDocument();
  expect(screen.getByText(/Phụ nữ mang thai/)).toBeInTheDocument();
  // Hai tiêu đề không được lẫn lộn: heading "phù hợp với" không được nhắc tới
  // bác sĩ, heading còn lại phải nói rõ cần hỏi ý kiến bác sĩ trước khi dùng.
  expect(screen.getByText("Phù hợp với")).toBeInTheDocument();
  expect(screen.getByText(/hỏi ý kiến bác sĩ/i)).toBeInTheDocument();
  expect(screen.queryByText(/Phù hợp với.*bác sĩ/i)).not.toBeInTheDocument();
});

it("AudienceNote chỉ có nhóm phù hợp thì không hiện khối cảnh báo bác sĩ", () => {
  render(<AudienceNote audience={{ suitable: ["Người đau mỏi chân"] }} />);

  expect(screen.getByText(/Người đau mỏi chân/)).toBeInTheDocument();
  expect(screen.getByText("Phù hợp với")).toBeInTheDocument();
  expect(screen.queryByText(/hỏi ý kiến bác sĩ/i)).not.toBeInTheDocument();
});

it("AudienceNote chỉ có nhóm cần hỏi bác sĩ vẫn hiện đủ, không rơi mất nội dung an toàn", () => {
  render(
    <AudienceNote
      audience={{ caution: ["Phụ nữ mang thai", "Người đặt máy trợ tim", "Vết thương hở"] }}
    />,
  );

  expect(screen.getByText(/hỏi ý kiến bác sĩ/i)).toBeInTheDocument();
  expect(screen.getByText(/Phụ nữ mang thai/)).toBeInTheDocument();
  expect(screen.getByText(/Người đặt máy trợ tim/)).toBeInTheDocument();
  expect(screen.getByText(/Vết thương hở/)).toBeInTheDocument();
  expect(screen.queryByText("Phù hợp với")).not.toBeInTheDocument();
});

it("UsageSteps giữ xuống dòng của nội dung plain text", () => {
  render(<UsageSteps items={[{ title: "Bước 1", detail: "Dòng một\nDòng hai" }]} />);

  const detail = screen.getByText(/Dòng một/);
  expect(detail).toHaveClass("whitespace-pre-line");
});

it("FaqAccordion mở nội dung khi bấm câu hỏi", async () => {
  render(<FaqAccordion items={[{ question: "Dùng bao lâu?", answer: "15-30 phút" }]} />);

  await userEvent.click(screen.getByRole("button", { name: /Dùng bao lâu/ }));

  expect(screen.getByText("15-30 phút")).toBeVisible();
});

it("VideoLinks mở tab mới an toàn", () => {
  render(<VideoLinks items={[{ label: "Hướng dẫn", url: "https://youtu.be/abc" }]} />);

  const link = screen.getByRole("link", { name: /Hướng dẫn/ });
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
});

it("CompanyFooter ẩn dòng có giá trị rỗng", () => {
  render(
    <CompanyFooter
      company={{
        name: "Công ty CP Desi Global",
        address: "",
        tax_code: "",
        hotline: "1900xxxx",
        zalo_url: "",
        facebook_url: "",
      }}
    />,
  );

  expect(screen.getByText(/Desi Global/)).toBeInTheDocument();
  expect(screen.getByText(/1900xxxx/)).toBeInTheDocument();
  expect(screen.queryByText(/Mã số thuế/)).not.toBeInTheDocument();
});

it("CompanyFooter chỉ có link mạng xã hội vẫn hiện, không bị guard nuốt mất", () => {
  render(
    <CompanyFooter
      company={{
        name: "",
        address: "",
        tax_code: "",
        hotline: "",
        zalo_url: "https://zalo.me/desi",
        facebook_url: "https://facebook.com/desi",
      }}
    />,
  );

  expect(screen.getByRole("link", { name: "Zalo" })).toHaveAttribute(
    "href",
    "https://zalo.me/desi",
  );
  expect(screen.getByRole("link", { name: "Fanpage" })).toHaveAttribute(
    "href",
    "https://facebook.com/desi",
  );
});

it("CompanyFooter rỗng hết cả 6 trường thì không render gì", () => {
  const { container } = render(
    <CompanyFooter
      company={{
        name: "",
        address: "",
        tax_code: "",
        hotline: "",
        zalo_url: "",
        facebook_url: "",
      }}
    />,
  );

  expect(container).toBeEmptyDOMElement();
});

it("ProductGallery một ảnh thì hiện ảnh chính có alt mô tả, không hiện dải thumbnail", () => {
  // alt mô tả (không phải "") cố ý: trang này tồn tại để xác minh hàng thật, ảnh
  // là bằng chứng chứ không phải trang trí — nên role ảnh phải là "img".
  render(<ProductGallery images={["https://cdn.example.com/a.jpg"]} />);

  expect(screen.getByRole("img", { name: "Ảnh sản phẩm 1" })).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("ProductGallery nhiều ảnh thì hiện dải thumbnail có tên truy cập được và đổi ảnh chính khi bấm", async () => {
  const { container } = render(
    <ProductGallery images={["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"]} />,
  );

  const thumb1 = screen.getByRole("button", { name: "Ảnh 1" });
  const thumb2 = screen.getByRole("button", { name: "Ảnh 2" });
  expect(thumb1).toBeInTheDocument();
  expect(thumb2).toBeInTheDocument();

  // Ảnh trong thumbnail có alt="" (role presentation) vì nút bao ngoài đã mang
  // tên khả truy cập, nên CHỈ ảnh chính có role "img" — query theo role được,
  // không cần selector theo thuộc tính `loading` như bản trước.
  expect(screen.getByRole("img", { name: "Ảnh sản phẩm 1" })).toHaveAttribute(
    "src",
    "https://cdn.example.com/a.jpg",
  );

  await userEvent.click(thumb2);

  expect(screen.getByRole("img", { name: "Ảnh sản phẩm 2" })).toHaveAttribute(
    "src",
    "https://cdn.example.com/b.jpg",
  );
  // Đúng một ảnh có role "img"; 2 ảnh còn lại là thumbnail trang trí.
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(container.querySelectorAll("img")).toHaveLength(3);
});
