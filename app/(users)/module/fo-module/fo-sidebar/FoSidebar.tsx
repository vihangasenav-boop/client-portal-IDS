"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  BarChart2,
  FileText,
  MessageSquare,
  RefreshCw,
  Settings,
  UserCircle,
  ChevronDown,
} from "lucide-react";

const BASE = "/module/fo-module";

const NAV = [
  {
    href: `${BASE}/business-accounts`,
    label: "Business Account",
    icon: LayoutDashboard,
    children: [
      {
        href: `${BASE}/business-accounts/account-type`,
        label: "Account Type",
      },
      {
        href: `${BASE}/business-accounts/sub-account-type`,
        label: "Sub Account Type",
      },
      {
        href: `${BASE}/business-accounts/lead-source`,
        label: "Lead Source",
      },
      {
        href: `${BASE}/business-accounts/lead-segment`,
        label: "Lead Segment",
      },
      {
        href: `${BASE}/business-accounts/sales-office`,
        label: "Sales Office",
      },
      {
        href: `${BASE}/business-accounts/sales-executive`,
        label: "Sales Executive",
      },
      {
        href: `${BASE}/business-accounts/collection-executive`,
        label: "Collection Executive",
      },
      {
        href: `${BASE}/business-accounts/company-profile`,
        label: "Company Profile",
      },
    ],
  },

  {
    href: `${BASE}/reservation`,
    label: "Reservation",
    icon: Building2,
    children: [
      {
        href: `${BASE}/reservation/reservation-type`,
        label: "Reservation Type",
      },
      {
        href: `${BASE}/reservation/business-source-group`,
        label: "Business Source Group",
      },
      {
        href: `${BASE}/reservation/business-source`,
        label: "Business Source",
      },
      {
        href: `${BASE}/reservation/market-segment-group`,
        label: "Market Segment Group",
      },
      {
        href: `${BASE}/reservation/market-segment`,
        label: "Market Segment",
      },
      {
        href: `${BASE}/reservation/channel-group`,
        label: "Channel Group",
      },
      {
        href: `${BASE}/reservation/channel`,
        label: "Channel",
      },
      {
        href: `${BASE}/reservation/origin`,
        label: "Origin",
      },
      {
        href: `${BASE}/reservation/cancellation-rule`,
        label: "Cancellation Rule",
      },
    ],
  },

  {
    href: `${BASE}/rooms`,
    label: "Room",
    icon: Users,
    children: [
      {
        href: `${BASE}/rooms/room-block`,
        label: "Block",
      },
      {
        href: `${BASE}/rooms/room-floor`,
        label: "Floor",
      },
      {
        href: `${BASE}/rooms/room-feature`,
        label: "Room Feature",
      },
      {
        href: `${BASE}/rooms/room-amenity`,
        label: "Room Amenity",
      },
      {
        href: `${BASE}/rooms/room-type`,
        label: "Room Type",
      },
      {
        href: `${BASE}/rooms/rooms`,
        label: "Rooms",
      },
    ],
  },

  {
    href: `${BASE}/cashiering`,
    label: "Cashiering",
    icon: ShieldCheck,
    children: [
      {
        href: `${BASE}/cashiering/revenue`,
        label: "Revenue",
      },
      {
        href: `${BASE}/cashiering/revenue-group`,
        label: "Revenue Group",
      },
      {
        href: `${BASE}/cashiering/payment-instruction`,
        label: "Payment Instruction",
      },
      {
        href: `${BASE}/cashiering/tax-slab`,
        label: "Tax Slab",
      },
      {
        href: `${BASE}/cashiering/tax-rule`,
        label: "Tax Rule",
      },
      {
        href: `${BASE}/cashiering/tax-linking-revenue`,
        label: "Tax Linking Revenue",
      },
      {
        href: `${BASE}/cashiering/currency`,
        label: "Currency",
      },
      {
        href: `${BASE}/cashiering/exchange-rate`,
        label: "Exchange Rate",
      },
      {
        href: `${BASE}/cashiering/map-credit-card`,
        label: "Map Credit Card",
      },
    ],
  },

  {
    href: `${BASE}/rate`,
    label: "Rate",
    icon: BarChart2,
    children: [
      {
        href: `${BASE}/rate/revenue`,
        label: "Revenue",
      },
      {
        href: `${BASE}/rate/revenue-group`,
        label: "Revenue Group",
      },
      {
        href: `${BASE}/rate/payment-instruction`,
        label: "Payment Instruction",
      },
      {
        href: `${BASE}/rate/tax-slab`,
        label: "Tax Slab",
      },
      {
        href: `${BASE}/rate/tax-rule`,
        label: "Tax Rule",
      },
      {
        href: `${BASE}/rate/tax-linking-revenue`,
        label: "Tax Linking Revenue",
      },
    ],
  },

  {
    href: `${BASE}/guest`,
    label: "Guest",
    icon: FileText,
    children: [
      {
        href: `${BASE}/guest/guest-status`,
        label: "Guest Status",
      },
      {
        href: `${BASE}/guest/designation`,
        label: "Designation",
      },
      {
        href: `${BASE}/guest/document-type`,
        label: "Document Type",
      },
      {
        href: `${BASE}/guest/preference-group`,
        label: "Preference Group",
      },
      {
        href: `${BASE}/guest/preference`,
        label: "Preference",
      },
      {
        href: `${BASE}/guest/membership-class`,
        label: "Membership Class",
      },
      {
        href: `${BASE}/guest/membership-type`,
        label: "Membership Type",
      },
      {
        href: `${BASE}/guest/dislike-type`,
        label: "Dislike Type",
      },
    ],
  },

  {
    href: `${BASE}/messages`,
    label: "Miscellaneous",
    icon: MessageSquare,
    children: [
      {
        href: `${BASE}/miscellaneous/hotel-department`,
        label: "Hotel Department",
      },
      {
        href: `${BASE}/miscellaneous/section`,
        label: "Section",
      },
      {
        href: `${BASE}/miscellaneous/reasons`,
        label: "Reasons",
      },
      {
        href: `${BASE}/miscellaneous/trace-definition`,
        label: "Trace Definition",
      },
      {
        href: `${BASE}/miscellaneous/offers`,
        label: "Offers",
      },
    ],
  },

  {
    href: `${BASE}/sync`,
    label: "User",
    icon: RefreshCw,
  },

  {
    href: `${BASE}/vouchers`,
    label: "Voucher",
    icon: RefreshCw,
  },
];

export default function FomSidebar() {
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState<string | null>(() => {
    const match = NAV.find(
      (item) =>
        item.children &&
        pathname.startsWith(item.href)
    );

    return match ? match.href : null;
  });

  return (
    <aside
      className="
        group
        fixed
        top-0
        left-0
        z-50
        min-h-screen
        flex
        flex-col
        w-16
        overflow-hidden
        bg-orange-500
        px-2
        py-3
        transition-all
        duration-300
        hover:w-56
        hover:overflow-y-auto
        hover:shadow-2xl
      "
    >
      {/* Logo */}
      <div className="mb-4 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/25">
          <span className="text-xs font-extrabold tracking-tight text-white">
            FX<sup className="text-[7px]">1</sup>
          </span>
        </div>

        <span
          className="
            whitespace-nowrap
            font-semibold
            text-white
            opacity-0
            transition-opacity
            duration-200
            group-hover:opacity-100
          "
        >
          FX Admin
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;

          const active = pathname.startsWith(item.href);

          const hasChildren =
            !!item.children &&
            item.children.length > 0;

          const isOpen =
            openMenu === item.href;

          {/* Normal link */}
          if (!hasChildren) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex
                  h-11
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  transition-all
                  ${
                    active
                      ? "bg-orange-700 font-semibold text-white shadow-sm"
                      : "text-white/80 hover:bg-orange-600 hover:text-white"
                  }
                `}
              >
                <Icon
                  size={18}
                  className="flex-shrink-0"
                />

                <span
                  className="
                    whitespace-nowrap
                    text-sm
                    font-medium
                    opacity-0
                    transition-opacity
                    duration-200
                    group-hover:opacity-100
                  "
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          {/* Parent with submenu */}
          return (
            <div key={item.href}>
              <button
                type="button"
                onClick={() =>
                  setOpenMenu(
                    isOpen ? null : item.href
                  )
                }
                aria-expanded={isOpen}
                className={`
                  flex
                  h-11
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  transition-all
                  ${
                    active
                      ? "bg-orange-700 font-semibold text-white shadow-sm"
                      : "text-white/80 hover:bg-orange-600 hover:text-white"
                  }
                `}
              >
                <Icon
                  size={18}
                  className="flex-shrink-0"
                />

                <span
                  className="
                    flex-1
                    whitespace-nowrap
                    text-left
                    text-sm
                    font-medium
                    opacity-0
                    transition-opacity
                    duration-200
                    group-hover:opacity-100
                  "
                >
                  {item.label}
                </span>

                <ChevronDown
                  size={16}
                  className={`
                    flex-shrink-0
                    opacity-0
                    transition-transform
                    duration-200
                    group-hover:opacity-100
                    ${isOpen ? "rotate-180" : ""}
                  `}
                />
              </button>

              {/* Children */}
              {isOpen && (
                <div
                  className="
                    mt-1
                    mb-1
                    hidden
                    flex-col
                    gap-1
                    pl-8
                    group-hover:flex
                  "
                >
                  {item.children!.map(
                    (child) => {
                      const childActive =
                        pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`
                            flex
                            h-9
                            items-center
                            rounded-md
                            px-2
                            text-sm
                            whitespace-nowrap
                            transition-colors
                            ${
                              childActive
                                ? "bg-orange-700 font-medium text-white"
                                : "text-white/70 hover:bg-orange-600 hover:text-white"
                            }
                          `}
                        >
                          {child.label}
                        </Link>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Push bottom links down */}
      <div className="flex-1" />

      {/* Bottom Navigation */}
      <div className="mt-4 flex flex-col gap-1">
        <Link
          href={`${BASE}/settings`}
          className="
            flex
            h-11
            items-center
            gap-3
            rounded-lg
            px-3
            text-white/80
            transition-all
            hover:bg-orange-600
            hover:text-white
          "
        >
          <Settings
            size={18}
            className="flex-shrink-0"
          />

          <span
            className="
              whitespace-nowrap
              text-sm
              font-medium
              opacity-0
              transition-opacity
              duration-200
              group-hover:opacity-100
            "
          >
            Settings
          </span>
        </Link>

        <Link
          href={`${BASE}/profile`}
          className="
            flex
            h-11
            items-center
            gap-3
            rounded-lg
            px-3
            text-white/80
            transition-all
            hover:bg-orange-600
            hover:text-white
          "
        >
          <UserCircle
            size={18}
            className="flex-shrink-0"
          />

          <span
            className="
              whitespace-nowrap
              text-sm
              font-medium
              opacity-0
              transition-opacity
              duration-200
              group-hover:opacity-100
            "
          >
            Profile
          </span>
        </Link>
      </div>
    </aside>
  );
}
