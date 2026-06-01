import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import en from "../locales/en.json";
import es from "../locales/es.json";

type Language = "en" | "es";
type TranslationKey = keyof typeof en;
type Translations = Record<TranslationKey, string>;

const STORAGE_KEY = "LOCALE";

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    // localStorage unavailable
  }
  return "es";
}

const translationMap: Record<Language, Translations> = {
  en: en as Translations,
  es: es as Translations,
};

interface TranslationContextValue {
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translationMap[language][key] ?? (en as Translations)[key] ?? key;
    },
    [language],
  );

  return (
    <TranslationContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx)
    throw new Error(
      "useTranslationContext must be used within TranslationProvider",
    );
  return ctx;
}
