import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, LogOut, User } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { apiFetch } from "@/lib/api";

export function AppLayout({ children }) {
  const { role } = useRole();
  const navigate = useNavigate();

  // Retrieve user data for the header
  const userDataStr = sessionStorage.getItem("userData");
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const firstName = userData?.firstName || userData?.first_name || userData?.name?.split(" ")[0] || "User";
  const avatarSrc = userData?.profile_picture_url || null;

  const handleLogout = async () => {
    try {
      await apiFetch(`${import.meta.env.VITE_API_URL}/logout`, { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    sessionStorage.removeItem("userData");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login", { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-sm font-medium text-foreground hidden sm:block">
                Hi, {firstName}
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden chess-gradient flex items-center justify-center border border-border cursor-pointer">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <ThemeToggle />
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
