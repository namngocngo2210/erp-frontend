import {
  DepartmentManager,
  type DepartmentChannelOption,
} from "@/features/users/DepartmentManager";
import type { Department } from "@/features/users/types";

type Props = {
  departments: Department[];
  channels: DepartmentChannelOption[];
  onCreate: (payload: {
    name: string;
    is_active: boolean;
    channel_ids?: number[];
  }) => Promise<void>;
  onUpdate: (
    id: number,
    payload: {
      name?: string;
      is_active?: boolean;
      channel_ids?: number[];
    },
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function DepartmentsPage(props: Props) {
  return <DepartmentManager {...props} />;
}

export default DepartmentsPage;
