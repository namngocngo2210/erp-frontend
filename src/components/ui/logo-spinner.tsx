import { cn } from "@/lib/utils";

/**
 * Spinner thương hiệu: logo DESI đứng yên (nhấp nhẹ) với một vòng cung
 * gradient xanh→cam xoay quanh. Thay cho spinner viền mặc định để mọi thao tác
 * tải dữ liệu đều mang nhận diện của sản phẩm.
 */
type LogoSpinnerProps = {
  /** Đường kính logo ở giữa (px). Vòng cung sẽ rộng hơn ~16px. */
  size?: number;
  className?: string;
  label?: string;
};

export function LogoSpinner({ size = 44, className, label = "Đang tải" }: LogoSpinnerProps) {
  const ring = size + 16;
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: ring, height: ring }}
    >
      {/* Vòng cung thương hiệu xoay quanh logo */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "0.9s" }}
      >
        {/* Rãnh nền mờ */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-border"
          opacity="0.3"
        />
        {/* Cung chạy — màu thương hiệu xanh azure */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="#1C7ED6"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="72 210"
        />
      </svg>
      {/* Logo nhấp nhẹ ở giữa */}
      <img
        src="/logo.jpg"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="animate-pulse rounded-md object-contain motion-reduce:animate-none"
        style={{ width: size * 0.62, height: size * 0.62 }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Lớp phủ dùng cho danh sách đang có dữ liệu: làm mờ nhẹ bảng và đặt
 * LogoSpinner ở giữa, giữ nguyên các dòng cũ phía dưới (chống nháy).
 */
export function LogoSpinnerOverlay({
  className,
  size = 52,
  label,
}: {
  className?: string;
  size?: number;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-40 flex items-center justify-center",
        "bg-background/55 backdrop-blur-[1px]",
        className,
      )}
    >
      <LogoSpinner size={size} label={label} />
    </div>
  );
}
