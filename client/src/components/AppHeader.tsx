import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import { logout } from "@/lib/api";
import { StyledAppBar, HeaderToolbar, Title, RightSlot } from "./AppHeader.style";

export interface AppHeaderProps {
  title: string;
  back?: string;
  showLogout?: boolean;
  right?: ReactNode;
}

export function AppHeader({ title, back, showLogout, right }: AppHeaderProps) {
  const navigate = useNavigate();
  return (
    <StyledAppBar position="sticky" elevation={0}>
      <HeaderToolbar disableGutters>
        {back ? (
          <IconButton
            edge="start"
            aria-label="Back"
            onClick={() => navigate({ to: back })}
          >
            <ArrowBackIcon />
          </IconButton>
        ) : null}
        <Title variant="h6" component="h1">
          {title}
        </Title>
        <RightSlot>
          {right}
          {showLogout ? (
            <IconButton
              aria-label="Log out"
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
            >
              <LogoutIcon />
            </IconButton>
          ) : null}
        </RightSlot>
      </HeaderToolbar>
    </StyledAppBar>
  );
}