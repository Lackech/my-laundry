import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";

interface HeaderProps {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="text-2xl">🧺</span>
            <span className="hidden font-bold sm:inline-block">My Laundry</span>
            <span className="font-bold sm:hidden">ML</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end">
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {user ? (
              <>
                {/* Mobile: Show only essential buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="md:inline-flex"
                >
                  <Link to="/dashboard">
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">📊</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex"
                >
                  <Link to="/calendar">Calendar</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex"
                >
                  <Link to="/machines">Machines</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden lg:inline-flex"
                >
                  <Link to="/queue">Queue</Link>
                </Button>

                {/* Mobile dropdown menu */}
                <div className="group relative sm:hidden">
                  <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </Button>
                  <div className="invisible absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-background opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100">
                    <div className="py-1">
                      <Link
                        to="/calendar"
                        className="block px-4 py-2 text-sm hover:bg-accent"
                      >
                        Calendar
                      </Link>
                      <Link
                        to="/machines"
                        className="block px-4 py-2 text-sm hover:bg-accent"
                      >
                        Machines
                      </Link>
                      <Link
                        to="/queue"
                        className="block px-4 py-2 text-sm hover:bg-accent"
                      >
                        Queue
                      </Link>
                    </div>
                  </div>
                </div>

                {/* User section */}
                <div className="ml-2 flex items-center gap-2">
                  <span className="hidden text-sm text-gray-600 md:inline">
                    Hello, {user.firstName}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/logout">
                      <span className="hidden sm:inline">Logout</span>
                      <span className="sm:hidden">🚪</span>
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex"
                >
                  <Link to="/">Home</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">
                    <span className="hidden sm:inline">Sign In</span>
                    <span className="sm:hidden">🔑</span>
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">
                    <span className="hidden sm:inline">Sign Up</span>
                    <span className="sm:hidden">📝</span>
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
