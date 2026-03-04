"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useAppStore } from "@/store";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const memberNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "◫" },
  { href: "/deals", label: "My Deals", icon: "◈" },
  { href: "/profile", label: "Profile & Buy Box", icon: "◉" },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Admin Dashboard", icon: "◫" },
  { href: "/admin/members", label: "Members", icon: "◎" },
  { href: "/admin/analytics", label: "Analytics", icon: "◇" },
  { href: "/admin/emails", label: "Email Tracking", icon: "◆" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  const role = session?.user?.role;
  const navItems = role === "admin" ? [...adminNav, ...memberNav] : memberNav;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-gray-900 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-tight">CCC Platform</h1>
          <p className="text-xs text-gray-400 mt-1">Deal Analysis</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {role === "admin" && (
            <div className="px-4 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin
              </span>
            </div>
          )}
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/admin" &&
                pathname.startsWith(item.href));

            // Show separator between admin and member nav
            const isFirstMember =
              role === "admin" && item.href === "/dashboard";

            return (
              <div key={item.href}>
                {isFirstMember && (
                  <div className="px-4 mt-4 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Member
                    </span>
                  </div>
                )}
                <Link
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-800">
          <div className="text-sm text-gray-300 truncate">
            {session?.user?.email}
          </div>
          <div className="text-xs text-gray-500 capitalize mt-0.5">
            {role}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
