import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import { logout, getUser } from "@/lib/api";
import { StyledAppBar, HeaderToolbar, Title, RightSlot } from "./AppHeader.style";

export interface AppHeaderProps {
  title: string;
  back?: string;
  showLogout?: boolean;
  right?: ReactNode;
}

export function AppHeader({ title, back, showLogout, right }: AppHeaderProps) {
  const navigate = useNavigate();
  const username = typeof window !== "undefined" ? getUser()?.username : undefined;
  return (
    <StyledAppBar position="sticky" elevation={0}>
      <HeaderToolbar disableGutters>
        {back ? (
          <IconButton edge="start" aria-label="Back" onClick={() => navigate({ to: back })}>
            <ArrowBackIcon />
          </IconButton>
        ) : null}
        <Title variant="h6" component="h1">
          {title}
        </Title>
        <RightSlot>
          {right}
          {showLogout && username ? (
            <Typography
              variant="body2"
              sx={{ opacity: 0.65, fontWeight: 500, whiteSpace: "nowrap" }}
            >
              {username}
            </Typography>
          ) : null}
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
