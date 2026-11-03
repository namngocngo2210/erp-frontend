/**
 * Bảng chuỗi tiếng Việt — ngôn ngữ mặc định, nằm tĩnh trong entry.
 *
 * Bản tiếng Anh tách sang `messages-en.ts` và chỉ tải bằng `import()` khi user
 * đổi ngôn ngữ (xem i18n.tsx) — trước đây cả 2 ngôn ngữ đều nằm trong entry
 * 600 KB dù gần như mọi user chỉ dùng tiếng Việt (audit 2026-09-23 P2-4).
 * Từng domain tách 2 file `messages/vi/<domain>.ts` và `messages/en/<domain>.ts`
 * để bundler cắt được: cùng một module thì không lazy được nửa nội dung.
 */
import { app } from "./messages/vi/app";
import { audit } from "./messages/vi/audit";
import { auth } from "./messages/vi/auth";
import { channels } from "./messages/vi/channels";
import { common } from "./messages/vi/common";
import { dashboard } from "./messages/vi/dashboard";
import { foxiaLink } from "./messages/vi/foxiaLink";
import { gender } from "./messages/vi/gender";
import { hr } from "./messages/vi/hr";
import { invoiceStatus } from "./messages/vi/invoiceStatus";
import { kiotviet } from "./messages/vi/kiotviet";
import { lang } from "./messages/vi/lang";
import { media } from "./messages/vi/media";
import { misc } from "./messages/vi/misc";
import { orderType } from "./messages/vi/orderType";
import { orders } from "./messages/vi/orders";
import { page } from "./messages/vi/page";
import { pancake } from "./messages/vi/pancake";
import { pancakePos } from "./messages/vi/pancakePos";
import { products } from "./messages/vi/products";
import { sidebar } from "./messages/vi/sidebar";
import { status } from "./messages/vi/status";
import { systemSettings } from "./messages/vi/systemSettings";
import { topnav } from "./messages/vi/topnav";
import { users } from "./messages/vi/users";

export const MESSAGES_VI = {
  ...app,
  ...audit,
  ...auth,
  ...channels,
  ...common,
  ...dashboard,
  ...foxiaLink,
  ...gender,
  ...hr,
  ...invoiceStatus,
  ...kiotviet,
  ...lang,
  ...media,
  ...misc,
  ...orderType,
  ...orders,
  ...page,
  ...pancake,
  ...pancakePos,
  ...products,
  ...sidebar,
  ...status,
  ...systemSettings,
  ...topnav,
  ...users,
} as const;
