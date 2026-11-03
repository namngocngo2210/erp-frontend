import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QualityTrendPoint } from "@/lib/api/call-quality";

type Props = { points: QualityTrendPoint[] };

const BLOCK_COLORS: Record<string, string> = {
  A: "#0ea5e9",
  B: "#6366f1",
  C: "#f59e0b",
  D: "#10b981",
};

/**
 * Điểm trung bình theo TUẦN. Gom tuần chứ không ngày: ~17 cuộc/ngày thì đường
 * theo ngày nhiễu tới mức không đọc được xu hướng.
 *
 * Vẽ bằng SVG thuần — trang chỉ cần một đường, kéo thêm thư viện chart cho một
 * biểu đồ là không đáng.
 */
export function QualityTrendChart({ points }: Props) {
  if (points.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Xu hướng theo tuần</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            Cần ít nhất 2 tuần dữ liệu để vẽ xu hướng.
          </p>
        </CardContent>
      </Card>
    );
  }

  const width = 640;
  const height = 180;
  const padding = { top: 12, right: 12, bottom: 24, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xOf = (index: number) =>
    padding.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  // Trục Y cố định 0-100 thay vì auto-scale: auto-scale làm một dao động 2 điểm
  // trông như đột biến, và người đọc sẽ hoảng vì cái không đáng.
  const yOf = (value: number) => padding.top + innerH - (Math.min(value, 100) / 100) * innerH;

  const linePath = (getter: (p: QualityTrendPoint) => number | undefined) => {
    const segments: string[] = [];
    points.forEach((point, index) => {
      const value = getter(point);
      if (value == null) return;
      segments.push(`${segments.length === 0 ? "M" : "L"} ${xOf(index)} ${yOf(value)}`);
    });
    return segments.join(" ");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Xu hướng theo tuần</CardTitle>
        <p className="text-xs text-muted-foreground">
          Sau buổi đào tạo về một khối, đường của khối đó phải nhích lên.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-3 pt-0">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-45 w-full min-w-[520px]">
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={yOf(tick)}
                y2={yOf(tick)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={yOf(tick) + 3}
                textAnchor="end"
                className="fill-muted-foreground text-xs"
              >
                {tick}
              </text>
            </g>
          ))}

          {Object.keys(BLOCK_COLORS).map((code) => (
            <path
              key={code}
              d={linePath((point) => point.blocks?.[code])}
              fill="none"
              stroke={BLOCK_COLORS[code]}
              strokeWidth={1.5}
              strokeOpacity={0.55}
            />
          ))}
          <path
            d={linePath((point) => point.avg_score)}
            fill="none"
            className="stroke-foreground"
            strokeWidth={2.5}
          />

          {points.map((point, index) => (
            <text
              key={point.week_start}
              x={xOf(index)}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-xs"
            >
              {point.week_start.slice(5)}
            </text>
          ))}
        </svg>

        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 bg-foreground" /> Tổng
          </span>
          {Object.entries({ A: "Mở đầu", B: "Khai thác", C: "Tư vấn", D: "Chốt đơn" }).map(
            ([code, label]) => (
              <span key={code} className="flex items-center gap-1">
                <span
                  className="inline-block h-0.5 w-4"
                  style={{ backgroundColor: BLOCK_COLORS[code] }}
                />
                {label}
              </span>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
