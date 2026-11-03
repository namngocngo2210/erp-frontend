/**
 * Bảng chuỗi tiếng Anh — CHỈ được import động từ i18n.tsx (lazy chunk).
 * Không import tĩnh file này ở nơi khác, nếu không nó lại chui vào entry.
 */
import { app } from "./messages/en/app";
import { audit } from "./messages/en/audit";
import { auth } from "./messages/en/auth";
import { channels } from "./messages/en/channels";
import { common } from "./messages/en/common";
import { dashboard } from "./messages/en/dashboard";
import { foxiaLink } from "./messages/en/foxiaLink";
import { gender } from "./messages/en/gender";
import { hr } from "./messages/en/hr";
import { invoiceStatus } from "./messages/en/invoiceStatus";
import { kiotviet } from "./messages/en/kiotviet";
import { lang } from "./messages/en/lang";
import { media } from "./messages/en/media";
import { misc } from "./messages/en/misc";
import { orderType } from "./messages/en/orderType";
import { orders } from "./messages/en/orders";
import { page } from "./messages/en/page";
import { pancake } from "./messages/en/pancake";
import { pancakePos } from "./messages/en/pancakePos";
import { products } from "./messages/en/products";
import { sidebar } from "./messages/en/sidebar";
import { status } from "./messages/en/status";
import { systemSettings } from "./messages/en/systemSettings";
import { topnav } from "./messages/en/topnav";
import { users } from "./messages/en/users";

export const MESSAGES_EN = {
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
