import { Badge } from "@/components/ui/badge";
import type { CustomerProfile, FieldSource } from "@/lib/api/customer-profile";
import { SOURCE_LABELS } from "@/features/customer-profile/profile-labels";

function Field({
  label,
  value,
  source,
}: {
  label: string;
  value: string | null;
  source?: FieldSource | null;
}) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
        <span>{value}</span>
        {source && (
          <Badge variant={source === "ai" ? "warning" : "outline"} className="text-xs">
            {SOURCE_LABELS[source]}
          </Badge>
        )}
      </div>
    </div>
  );
}

function Chips({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary">
            {v}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/** Chân dung khách tự khai (phiếu sale hỏi, hoặc AI suy từ ghi âm cuộc gọi).
 *
 * Khối này ẨN HẲN khi không có gì — đó là trạng thái của khoảng 98/100 khách.
 * Hiện một khung rỗng với chín dòng gạch ngang khiến mọi hồ sơ trông như dữ
 * liệu bị lỗi, và là cách nhanh nhất để cả màn hình bị coi là hỏng.
 *
 * Mỗi trường mang nhãn nguồn: giá trị AI suy ra không cùng độ tin cậy với giá
 * trị sale hỏi trực tiếp, và trộn hai thứ lại là biến phỏng đoán thành sự thật.
 */
export function ProfileDeclared({ profile }: { profile: CustomerProfile }) {
  const hasAnything =
    profile.filled_field_count > 0 ||
    profile.need_codes.length > 0 ||
    profile.lifestyle_habit_codes.length > 0 ||
    profile.purchase_barrier_codes.length > 0 ||
    profile.relax_time_codes.length > 0 ||
    profile.delax_source_codes.length > 0;

  if (!hasAnything) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Chân dung khách khai báo</h3>
        {profile.ai_field_count > 0 && (
          <span className="text-xs text-muted-foreground">
            {profile.ai_field_count} trường do AI suy ra
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Độ tuổi" value={profile.age_text} source={profile.age_text_src} />
        <Field
          label="Nghề nghiệp"
          value={profile.occupation_code}
          source={profile.occupation_code_src}
        />
        <Field
          label="Mức độ đau"
          value={profile.pain_level_code}
          source={profile.pain_level_code_src}
        />
        <Field label="Thời gian bị đau" value={profile.pain_duration_code} />
        <Field
          label="Từng dùng máy massage"
          value={
            profile.used_massage_before === null
              ? null
              : profile.used_massage_before
                ? "Có"
                : "Chưa"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Chips label="Nhu cầu" values={profile.need_codes} />
        <Chips label="Rào cản mua" values={profile.purchase_barrier_codes} />
        <Chips label="Thói quen sinh hoạt" values={profile.lifestyle_habit_codes} />
        <Chips label="Thời điểm thư giãn" values={profile.relax_time_codes} />
        <Chips label="Biết đến qua" values={profile.delax_source_codes} />
      </div>
    </section>
  );
}
