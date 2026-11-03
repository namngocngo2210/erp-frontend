import { useState } from "react";

export function ProductGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  return (
    <div>
      <img
        src={images[active]}
        alt={`Ảnh sản phẩm ${active + 1}`}
        className="aspect-square w-full rounded-2xl object-cover"
        loading="eager"
      />
      {images.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ảnh ${index + 1}`}
              aria-current={index === active}
              className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                index === active ? "border-emerald-600" : "border-transparent"
              }`}
            >
              {/* alt rỗng là CỐ Ý: nút bao ngoài đã mang tên khả truy cập
                  (`aria-label="Ảnh N"`). Đặt alt mô tả ở đây sẽ trùng tên với
                  ảnh lớn đang hiển thị, khiến trình đọc màn hình đọc hai lần
                  cùng một nhãn mà không phân biệt được đâu là ảnh chính, đâu là
                  nút chọn ảnh. */}
              <img src={src} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
