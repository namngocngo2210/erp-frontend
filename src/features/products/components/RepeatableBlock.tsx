import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * Danh sách dòng thêm/xoá được, dùng chung cho các khối nội dung dạng
 * "danh sách object đồng nhất field" (điểm nổi bật, thông số kỹ thuật, hướng
 * dẫn sử dụng, xử lý sự cố, video). Mỗi khối chỉ khác nhau ở số ô nhập/placeholder
 * nên tách ra đây thay vì viết năm lần gần giống nhau.
 *
 * FAQ và "Đối tượng sử dụng" KHÔNG dùng component này:
 * - FAQ cần thêm 1 toggle hiện/ẩn RIÊNG cho từng dòng (ngoài toggle hiện cả
 *   khối) — nội dung FAQ import từ file Excel là kịch bản tư vấn qua điện
 *   thoại, mọi dòng phải vào mặc định `visible: false`, biên tập viên tự bật
 *   sau khi viết lại giọng văn phù hợp trang public.
 * - "Đối tượng sử dụng" là 2 danh sách CHUỖI độc lập (suitable/caution), không
 *   phải danh sách object nhiều field.
 * Cả hai viết riêng ngay trong `ProductContentForm.tsx`.
 */
export function RepeatableBlock<T extends Record<string, unknown>>({
  title,
  addLabel,
  items,
  onChange,
  makeEmpty,
  fields,
  visible,
  onVisibleChange,
  disabled = false,
}: {
  title: string;
  addLabel: string;
  items: T[];
  onChange: (next: T[]) => void;
  makeEmpty: () => T;
  fields: { key: keyof T; placeholder: string; multiline?: boolean }[];
  visible: boolean;
  onVisibleChange: (next: boolean) => void;
  /** `products:view`-only: hiện dữ liệu để đọc, khoá mọi ô nhập/nút thêm-xoá. */
  disabled?: boolean;
}) {
  const updateField = (index: number, key: keyof T, value: string) =>
    onChange(items.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={visible}
            onCheckedChange={onVisibleChange}
            aria-label={`Hiện khối ${title}`}
            disabled={disabled}
          />
          Hiện trên trang
        </label>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            {fields.map((field) => {
              const value = String(item[field.key] ?? "");
              return field.multiline ? (
                <Textarea
                  key={String(field.key)}
                  rows={2}
                  className="flex-1"
                  placeholder={field.placeholder}
                  value={value}
                  disabled={disabled}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
              ) : (
                <Input
                  key={String(field.key)}
                  className="flex-1"
                  placeholder={field.placeholder}
                  value={value}
                  disabled={disabled}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Xoá dòng ${index + 1}`}
              disabled={disabled}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...items, makeEmpty()])}
        >
          <Plus className="mr-1 size-4" aria-hidden />
          {addLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
