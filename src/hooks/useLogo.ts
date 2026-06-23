import { useTheme } from "./useTheme";

export function useLogo(): string {
  const { theme } = useTheme();
  return theme === "dark" ? "/logo.png" : "/logo-black.svg";
}
