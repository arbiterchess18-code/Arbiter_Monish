import {
  LayoutDashboard, Trophy, PlusCircle, Settings, Users, BarChart3,
  ClipboardList, User, Swords, Award, Search, Crown, ChevronDown
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useRole } from "@/lib/role-context";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const orbiterLinks = [
  { title: "Dashboard", url: "/orbiter", icon: LayoutDashboard },
  { title: "Create Tournament", url: "/orbiter/create", icon: PlusCircle },
  { title: "Manage Tournaments", url: "/orbiter/manage", icon: Settings },
  { title: "Results Entry", url: "/orbiter/results", icon: ClipboardList },
  { title: "Leaderboards", url: "/orbiter/leaderboards", icon: Trophy },
  { title: "Statistics", url: "/orbiter/stats", icon: BarChart3 },
  { title: "Organizer Requests", url: "/orbiter/requests", icon: Users },
];

const userLinks = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Tournaments", url: "/tournaments", icon: Search },
  { title: "My Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Match History", url: "/history", icon: Swords },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Achievements", url: "/achievements", icon: Award },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Orbiter Vacancy", url: "/vacancy", icon: Crown },
];

export function AppSidebar() {
  const { role, setRole } = useRole();
  const links = role === "orbiter" ? orbiterLinks : userLinks;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg chess-gradient flex items-center justify-center">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">ChessMgr</h2>
            <p className="text-[11px] text-muted-foreground capitalize">{role} Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/" || item.url === "/orbiter"}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm h-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full chess-gradient flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                  {role === "orbiter" ? "OA" : "PL"}
                </div>
                <span className="capitalize">{role === "orbiter" ? "Arbiter" : "Player"}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setRole("user")}>
              <User className="mr-2 h-4 w-4" /> Player View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRole("orbiter")}>
              <Crown className="mr-2 h-4 w-4" /> Orbiter View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
