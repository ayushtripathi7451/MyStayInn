import React, { createContext, useContext, useState } from "react";

type ThemeType = "male" | "female";

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: any) => {
  const [theme, setTheme] = useState<ThemeType>("male");

  const primaryColor =
    theme === "female" ? "bg-pink-500" : "bg-purple-500";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
