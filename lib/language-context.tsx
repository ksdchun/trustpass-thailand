"use client";

import { createContext, useContext, useState } from "react";
import type { UILang } from "@/lib/translations";

type LanguageContextValue = {
  lang: UILang;
  setLang: (lang: UILang) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {}
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<UILang>("en");
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
