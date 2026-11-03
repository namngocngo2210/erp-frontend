import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "checked" | "onChange"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, id, name, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange && !disabled) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      // `relative` BẮT BUỘC, đừng gỡ. Ô nhập thật bị giấu bằng `sr-only`, mà
      // `sr-only` của Tailwind là `position: absolute`. Không có tổ tiên nào
      // định vị thì khối chứa của nó là KHỐI CHỨA GỐC (cả document) — ô nhập
      // thoát khỏi `overflow-hidden` của khung app và kéo dài chiều cao
      // document tới đúng toạ độ của nó. Trên trang dài (đo thật: 20.000px)
      // cửa sổ trở nên cuộn được; bấm vào gạt là ô nhập nhận focus, trình
      // duyệt cuộn nó vào tầm nhìn và đẩy CẢ app ra khỏi màn hình → người dùng
      // chỉ thấy màn trắng. Sự cố prod 2026-08-25 ở màn Nội dung trang sản phẩm.
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          id={id}
          name={name}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <span
          className={cn(
            "inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-primary" : "bg-input",
            className,
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
              checked ? "translate-x-4" : "translate-x-0",
            )}
          />
        </span>
      </label>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
