import { styled } from "@mui/material/styles";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";

export const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "rgba(250, 246, 236, 0.85)",
  backdropFilter: "blur(10px)",
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
  color: theme.palette.text.primary,
}));

export const HeaderToolbar = styled(Toolbar)({
  maxWidth: 672,
  width: "100%",
  margin: "0 auto",
  minHeight: 56,
  gap: 8,
  paddingLeft: 16,
  paddingRight: 16,
});

export const Title = styled(Typography)({
  flex: 1,
  fontWeight: 600,
  fontSize: "1.125rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}) as typeof Typography;

export const RightSlot = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
});