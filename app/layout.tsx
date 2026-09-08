import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { isAdminRole, isFieldTechRole } from "@/lib/roles";
import { logout } from "./logout/actions";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Stone Security — Field Service",
  description: "Customer, job, scheduling, and QBO sync management.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className={montserrat.variable}>
      <body>
        <nav className="topnav">
          <div className="topnav-primary">
            <strong className="brand">
              Stone<span className="brand-light">Security</span>
            </strong>
            {session && isFieldTechRole(session.roleName) && (
              <>
                <Link href="/jobs">Jobs</Link>
                <Link href="/schedule">Schedule</Link>
                <Link href="/time">Time</Link>
              </>
            )}
            {session && !isFieldTechRole(session.roleName) && (
              <>
                <Link href="/service-requests">Requests</Link>
                <Link href="/customers">Customers</Link>
                <Link href="/jobs">Jobs</Link>
                <Link href="/quotes">Quotes</Link>
                <Link href="/invoices">Invoices</Link>
                <Link href="/schedule">Schedule</Link>
                <Link href="/time">Time</Link>
                <Link href="/inventory">Inventory</Link>
                <Link href="/depots">Depots</Link>
                {isAdminRole(session.roleName) && <Link href="/users">Team</Link>}
              </>
            )}
          </div>
          {session && (
            <div className="topnav-actions">
              <form action="/search" method="get" className="topnav-search">
                <input type="search" name="q" placeholder="Search…" aria-label="Search" />
              </form>
              <span className="meta">
                {session.fullName} ({session.roleName})
              </span>
              <form action={logout}>
                <button type="submit" className="btn-danger">
                  Log Out
                </button>
              </form>
            </div>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
