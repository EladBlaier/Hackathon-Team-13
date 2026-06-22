import { styled, alpha } from "@mui/material/styles";
import { Box, Paper, Fab } from "@mui/material";
import { Link as RouterLink } from "@tanstack/react-router";

export const PageRoot = styled(Box)({
  minHeight: "100vh",
  paddingBottom: 112,
});

export const Main = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(3, 2, 0),
}));

export const Greeting = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const QuickGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(4),
}));

export const QuickPrimary = styled(RouterLink)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: 20,
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  textDecoration: "none",
  boxShadow: `0 16px 32px -12px ${alpha(theme.palette.primary.main, 0.45)}`,
  transition: "transform 150ms ease",
  "&:hover": { transform: "translateY(-2px)" },
}));

export const QuickSecondary = styled(RouterLink)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 20,
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  textDecoration: "none",
  transition: "background-color 150ms ease",
  "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
}));

export const QuickTitle = styled("div")({
  fontWeight: 600,
  fontSize: "0.95rem",
});

export const QuickSub = styled("div")({
  fontSize: "0.75rem",
  opacity: 0.8,
});

export const SectionHead = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: theme.spacing(1.5),
}));

export const Grid2 = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: theme.spacing(1.5),
}));

export const SkeletonTile = styled(Box)(({ theme }) => ({
  aspectRatio: "1 / 1",
  borderRadius: 20,
  backgroundColor: theme.palette.action.hover,
  animation: "pulse 1.5s ease-in-out infinite",
  "@keyframes pulse": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.5 },
  },
}));

export const EmptyCard = styled(Paper)(({ theme }) => ({
  border: `1px dashed ${theme.palette.divider}`,
  borderRadius: 20,
  padding: theme.spacing(4),
  textAlign: "center",
  boxShadow: "none",
}));

export const HomeworkTile = styled(RouterLink)(({ theme }) => ({
  position: "relative",
  aspectRatio: "1 / 1",
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  textDecoration: "none",
  display: "block",
  transition: "box-shadow 150ms ease",
  "&:hover": { boxShadow: theme.shadows[4] },
}));

export const TileImage = styled("img")({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const TileGradient = styled(Box)(({ theme }) => ({
  position: "absolute",
  inset: 0,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.success.main, 0.3)})`,
}));

export const TileShade = styled(Box)({
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.1) 50%, transparent)",
});

export const TileMeta = styled(Box)(({ theme }) => ({
  position: "absolute",
  insetInline: 0,
  bottom: 0,
  padding: theme.spacing(1.5),
  color: "#fff",
}));

export const TileStatusRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: "0.625rem",
  opacity: 0.9,
  marginBottom: 4,
  textTransform: "capitalize",
});

export const TileTitle = styled("div")({
  fontWeight: 600,
  fontSize: "0.875rem",
  lineHeight: 1.2,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

export const StatusDotEl = styled("span", {
  shouldForwardProp: (p) => p !== "status",
})<{ status: "pending" | "reviewing" | "completed" }>(({ status }) => ({
  display: "inline-block",
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor:
    status === "completed"
      ? "#34d399"
      : status === "reviewing"
        ? "#fbbf24"
        : "#cbd5e1",
  animation: status === "reviewing" ? "blink 1.2s ease-in-out infinite" : "none",
  "@keyframes blink": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.4 },
  },
}));

export const Floating = styled(Fab)(({ theme }) => ({
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 40,
  boxShadow: `0 16px 32px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
}));