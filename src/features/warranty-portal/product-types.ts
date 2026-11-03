import type { PortalWarranty } from "./types";

export type ProductHighlight = { title: string; detail: string };
export type ProductSpec = { label: string; value: string };
export type ProductAudience = { suitable?: string[]; caution?: string[] };
export type ProductUsageStep = { title: string; detail: string };
export type ProductTrouble = { symptom: string; cause: string; fix: string };
export type ProductFaq = { question: string; answer: string };
export type ProductVideo = { label: string; url: string };

export type ProductContent = {
  sku: string;
  name: string;
  short_description: string;
  images: string[];
  highlights: ProductHighlight[];
  specs: ProductSpec[];
  audience: ProductAudience;
  usage_steps: ProductUsageStep[];
  troubleshooting: ProductTrouble[];
  faqs: ProductFaq[];
  videos: ProductVideo[];
};

export type ProductCompany = {
  name: string;
  address: string;
  tax_code: string;
  hotline: string;
  zalo_url: string;
  facebook_url: string;
};

export type ProductPageResponse = {
  code: string;
  serial: string;
  authentic: boolean;
  scan: { count: number; first_at: string | null };
  product: ProductContent | null;
  warranty: PortalWarranty | null;
  company: ProductCompany;
};
