import React, { createContext, useContext, useState, useEffect } from "react";

const RoleContext = createContext(undefined);

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return userData.role || null;
  });

  // Listen for login/logout events
  useEffect(() => {
    const handleAuthChange = () => {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      setRole(userData.role || null);
    };

    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (ctx === undefined) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
