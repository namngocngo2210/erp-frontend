import type { ProductCompany } from "../../product-types";

/** Cả 6 trường công ty đều lấy từ env, có thể để trống hợp lệ — mỗi dòng tự
 * ẩn khi rỗng thay vì hiện nhãn trơ trọi. */
export function CompanyFooter({ company }: { company: ProductCompany }) {
  const rows = [
    ["", company.name],
    ["Địa chỉ", company.address],
    ["Mã số thuế", company.tax_code],
    ["Hotline", company.hotline],
  ].filter(([, value]) => Boolean(value));
  const hasSocial = Boolean(company.zalo_url) || Boolean(company.facebook_url);

  // Guard phải tính cả zalo_url/facebook_url — nếu chỉ so `rows` (4 trường đầu)
  // thì lô chỉ điền mạng xã hội sẽ bị ẩn cả footer, mất luôn kênh hỗ trợ duy nhất.
  if (rows.length === 0 && !hasSocial) return null;

  return (
    <footer className="mt-10 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
      {rows.map(([label, value]) => (
        <p key={label || "name"} className={label ? "" : "font-semibold text-slate-900"}>
          {label ? `${label}: ` : ""}
          {value}
        </p>
      ))}
      <div className="mt-2 flex gap-4">
        {company.zalo_url ? (
          <a
            href={company.zalo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Zalo
          </a>
        ) : null}
        {company.facebook_url ? (
          <a
            href={company.facebook_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Fanpage
          </a>
        ) : null}
      </div>
    </footer>
  );
}
