import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ChefHat,
  Settings,
  Sparkles,
  Tags,
  Utensils,
  Info,
  Star,
  Mail,
  Inbox,
  Home,
  MessagesSquare,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import { useLang } from "@/contexts/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type AdminRoute =
  | "/admin"
  | "/admin/recipes"
  | "/admin/ingredients"
  | "/admin/categories"
  | "/admin/kitchens"
  | "/admin/users"
  | "/admin/community"
  | "/admin/content/home"
  | "/admin/content/about"
  | "/admin/content/features"
  | "/admin/content/contact"
  | "/admin/messages"
  | "/admin/settings";

interface NavItem {
  to: AdminRoute;
  icon: LucideIcon;
  labelAr: string;
  labelEn: string;
  exact?: boolean;
}

interface NavGroup {
  labelAr: string;
  labelEn: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelAr: "نظرة عامة",
    labelEn: "Overview",
    items: [
      {
        to: "/admin",
        icon: LayoutDashboard,
        labelAr: "لوحة التحكم",
        labelEn: "Dashboard",
        exact: true,
      },
    ],
  },
  {
    labelAr: "المحتوى",
    labelEn: "Content",
    items: [
      { to: "/admin/recipes", icon: ChefHat, labelAr: "الوصفات", labelEn: "Recipes" },
      { to: "/admin/kitchens", icon: Utensils, labelAr: "المطابخ", labelEn: "Kitchens" },
      { to: "/admin/ingredients", icon: Sparkles, labelAr: "المكونات", labelEn: "Ingredients" },
      { to: "/admin/categories", icon: Tags, labelAr: "الأصناف", labelEn: "Categories" },
    ],
  },
  {
    labelAr: "المستخدمون",
    labelEn: "People",
    items: [
      { to: "/admin/users", icon: Users, labelAr: "المستخدمين", labelEn: "Users" },
      { to: "/admin/community", icon: MessagesSquare, labelAr: "المجتمع", labelEn: "Community" },
      { to: "/admin/messages", icon: Inbox, labelAr: "الرسائل", labelEn: "Messages" },
    ],
  },
  {
    labelAr: "صفحات الموقع",
    labelEn: "Site pages",
    items: [
      { to: "/admin/content/home", icon: Home, labelAr: "الرئيسية", labelEn: "Home" },
      { to: "/admin/content/about", icon: Info, labelAr: "من نحن", labelEn: "About" },
      { to: "/admin/content/features", icon: Star, labelAr: "المميزات", labelEn: "Features" },
      { to: "/admin/content/contact", icon: Mail, labelAr: "تواصل معنا", labelEn: "Contact" },
    ],
  },
  {
    labelAr: "النظام",
    labelEn: "System",
    items: [
      { to: "/admin/settings", icon: Settings, labelAr: "إعدادات الموقع", labelEn: "Site settings" },
    ],
  },
];

export function AdminSidebar() {
  const { lang } = useLang();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isItemActive = (item: NavItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <Sidebar collapsible="icon" side={lang === "ar" ? "right" : "left"}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight">
                {lang === "ar" ? "لوحة الأدمن" : "Admin Panel"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {lang === "ar" ? "إدارة الموقع" : "Site management"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.labelEn}>
            <SidebarGroupLabel>{lang === "ar" ? group.labelAr : group.labelEn}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isItemActive(item);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={lang === "ar" ? item.labelAr : item.labelEn}
                      >
                        <Link to={item.to}>
                          <item.icon className="h-4 w-4" />
                          <span>{lang === "ar" ? item.labelAr : item.labelEn}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={lang === "ar" ? "العودة للموقع" : "Back to site"}
            >
              <Link to="/">
                <ExternalLink className="h-4 w-4" />
                <span>{lang === "ar" ? "العودة للموقع" : "Back to site"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
