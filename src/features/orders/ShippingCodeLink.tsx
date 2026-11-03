type ShippingCodeLinkProps = {
  shippingCode?: string | null;
  providerCode?: string | null;
  className?: string;
};

function buildTrackingUrl(shippingCode: string, providerCode?: string | null): string {
  const provider = (providerCode ?? "").toUpperCase();

  if (provider === "GHN") {
    return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(shippingCode)}`;
  }

  return `https://www.best-inc.vn/track?bills=${encodeURIComponent(shippingCode)}`;
}

export function ShippingCodeLink({ shippingCode, providerCode, className }: ShippingCodeLinkProps) {
  const code = String(shippingCode ?? "").trim();

  if (!code) {
    return <span>-</span>;
  }

  return (
    <a
      href={buildTrackingUrl(code, providerCode)}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "font-medium text-primary underline-offset-4 hover:underline"}
      onClick={(event) => event.stopPropagation()}
    >
      {code}
    </a>
  );
}
