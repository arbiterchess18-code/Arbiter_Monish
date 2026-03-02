import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
    theme: "light",
    setTheme: () => null,
});

export function ThemeProvider({
    children,
    defaultTheme = "light",
    storageKey = "chess-ui-theme",
    ...props
}) {
    const [theme, setTheme] = useState(
        () => localStorage.getItem(storageKey) || defaultTheme
    );

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem(storageKey, theme);
    }, [theme, storageKey]);

    const value = {
        theme,
        setTheme: (theme) => setTheme(theme),
    };

    return (
        <ThemeContext.Provider {...props} value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");
    return context;
};
