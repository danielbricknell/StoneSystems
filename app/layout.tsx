import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { logout } from "./logout/actions";

export const metadata: Metadata = {
  title: "Field Service App",
  description: "Customer, job, scheduling, and QBO sync management.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <nav className="topnav">
          <strong>Field Service App</strong>
          {session && session.roleName === "Field Tech" && (
            <>
              <Link href="/jobs">Jobs</Link>
              <Link href="/schedule">Schedule</Link>
              <Link href="/time">Time</Link>
            </>
          )}
          {session && session.roleName !== "Field Tech" && (
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
              {session.roleName === "Admin" && <Link href="/users">Team</Link>}
            </>
          )}
          <span className="topnav-spacer" />
          {session && (
            <form action="/search" method="get" className="topnav-search">
              <input type="search" name="q" placeholder="Search…" aria-label="Search" />
            </form>
          )}
          {session && (
            <>
              <span className="meta">
                {session.fullName} ({session.roleName})
              </span>
              <form action={logout}>
                <button type="submit" className="btn-danger">
                  Log Out
                </button>
              </form>
            </>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
