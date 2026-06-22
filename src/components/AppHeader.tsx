import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

export function AppHeader({
  title,
  back,
  showLogout,
  right,
}: {
  title: string;
  back?: string;
  showLogout?: boolean;
  right?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
        {back ? (
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link to={back}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        ) : null}
        <h1 className="font-semibold text-lg flex-1 truncate">{title}</h1>
        {right}
        {showLogout ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        ) : null}
      </div>
    </header>
  );
}