import {
  LayoutDashboard, Trophy, PlusCircle, Settings, Users, BarChart3,
  ClipboardList, User, Swords, Award, Search, Crown, Gamepad2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useRole } from "@/lib/role-context";


const orbiterConductingLinks = [
  { title: "Arbiter Home", url: "/arbiter-userhome", icon: LayoutDashboard },
  { title: "Conducting Dashboard", url: "/orbiter", icon: LayoutDashboard },
  { title: "Create Tournament", url: "/orbiter/create", icon: PlusCircle },
  { title: "Manage Tournaments", url: "/orbiter/manage", icon: Settings },
  { title: "Results Entry", url: "/orbiter/results", icon: ClipboardList },
  { title: "Leaderboards", url: "/orbiter/leaderboards", icon: Trophy },
  { title: "Statistics", url: "/orbiter/stats", icon: BarChart3 },
  { title: "Organizer Requests", url: "/orbiter/requests", icon: Users },
];

const orbiterPlayingLinks = [
  { title: "Playing Dashboard", url: "/orbiter/playing", icon: Gamepad2 },
  { title: "My Match History", url: "/orbiter/my-history", icon: Swords },
  { title: "Achievements", url: "/orbiter/achievements", icon: Award },
  { title: "Arbiter Vacancies", url: "/orbiter/vacancies", icon: Crown },
];

const userLinks = [
  { title: "Player Home", url: "/player-userhome", icon: LayoutDashboard },
  { title: "Tournaments", url: "/tournaments", icon: Search },
  { title: "My Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Match History", url: "/history", icon: Swords },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Achievements", url: "/achievements", icon: Award },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { role, setRole } = useRole();

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
        {role === "arbiter" ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 mb-1">
                Conducting
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {orbiterConductingLinks.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/orbiter"}
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

            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 mb-1 mt-2">
                Playing
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {orbiterPlayingLinks.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
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
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 mb-1">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userLinks.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
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
        )}
      </SidebarContent>
    </Sidebar>
  );
}
