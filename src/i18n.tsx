import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { MESSAGES_VI } from "@/i18n/messages";
import { swallowError } from "@/lib/errors";

export type Language = "vi" | "en";

type MessageTable = Record<string, string>;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
};

const STORAGE_KEY = "desi_fe_lang";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

// Bảng tiếng Anh tải lazy (chunk riêng) — giữ lại sau lần tải đầu để đổi qua
// lại vi/en không tải lại. Đặt ngoài component để mọi provider dùng chung.
let enMessagesCache: MessageTable | null = null;
let enMessagesPromise: Promise<MessageTable> | null = null;

function loadEnMessages(): Promise<MessageTable> {
  if (enMessagesCache) return Promise.resolve(enMessagesCache);
  if (!enMessagesPromise) {
    enMessagesPromise = import("@/i18n/messages-en").then((mod) => {
      enMessagesCache = mod.MESSAGES_EN as MessageTable;
      return enMessagesCache;
    });
  }
  return enMessagesPromise;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [enMessages, setEnMessages] = useState<MessageTable | null>(enMessagesCache);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (err) {
      // ignore storage errors
      swallowError(err, "i18n.language.storage");
    }
    document.documentElement.lang = language;
  }, [language]);

  // Đổi sang "en" mới tải bảng tiếng Anh; trong lúc chờ hiển thị tiếng Việt
  // thay vì key thô. Tiếng Việt luôn tĩnh trong entry.
  useEffect(() => {
    if (language !== "en" || enMessages) return;
    let cancelled = false;
    loadEnMessages()
      .then((table) => {
        if (!cancelled) setEnMessages(table);
      })
      .catch((err: unknown) => {
        console.warn("[i18n.loadEn]", err);
      });
    return () => {
      cancelled = true;
    };
  }, [language, enMessages]);

  const value = useMemo<I18nContextValue>(() => {
    const table: MessageTable =
      language === "en" && enMessages ? enMessages : (MESSAGES_VI as MessageTable);
    return {
      language,
      setLanguage,
      t: (key: string, fallback?: string) => table[key] ?? fallback ?? key,
    };
  }, [language, enMessages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Provider + hook cùng file là pattern context chuẩn; không tách được vì
// I18nProvider được import ở main.tsx và useI18n có ~76 importer.
// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
