import { CheckInCore } from "@/features/hr/components/CheckInCore";

export default function CheckInPage() {
  // CheckInCore already renders its own "Chấm công" header — avoid duplicating it here.
  return <CheckInCore />;
}
