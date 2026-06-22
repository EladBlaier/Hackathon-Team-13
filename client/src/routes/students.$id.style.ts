import { styled, alpha } from "@mui/material/styles";
import { Box, Paper } from "@mui/material";

export const PageRoot = styled(Box)({
  minHeight: "100vh",
});

export const Main = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(3, 2, 5),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
}));

export const HeaderCard = styled(Paper)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: theme.spacing(2.5),
  borderRadius: 20,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
}));

export const AvatarCircle = styled(Box)(({ theme }) => ({
  width: 56,
  height: 56,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  backgroundColor: alpha(theme.palette.primary.main, 0.12),
  color: theme.palette.primary.main,
}));

export const HeaderInfo = styled(Box)({
  minWidth: 0,
});

export const HeaderId = styled("div")({
  fontWeight: 700,
  fontSize: "1.4rem",
  lineHeight: 1.2,
});

export const HeaderSub = styled("div")(({ theme }) => ({
  fontSize: "0.8rem",
  color: theme.palette.text.secondary,
  marginTop: 2,
}));

export const SummaryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: 20,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
}));

export const SummaryLabel = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
  color: theme.palette.primary.main,
  fontWeight: 600,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginBottom: theme.spacing(1),
}));

export const SummaryText = styled("p")(({ theme }) => ({
  margin: 0,
  fontSize: "0.9rem",
  lineHeight: 1.6,
  color: theme.palette.text.primary,
}));

export const SectionTitle = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  fontWeight: 600,
  fontSize: "0.95rem",
  marginBottom: theme.spacing(1.5),
}));

export const TldrList = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

const TONE_COLORS = {
  positive: { main: "#16a34a", bg: "rgba(22, 163, 74, 0.08)", border: "rgba(22, 163, 74, 0.25)" },
  negative: { main: "#dc2626", bg: "rgba(220, 38, 38, 0.08)", border: "rgba(220, 38, 38, 0.25)" },
} as const;

export const TldrRow = styled(Box, {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "positive" | "negative" }>(({ tone }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 14,
  backgroundColor: TONE_COLORS[tone].bg,
  border: `1px solid ${TONE_COLORS[tone].border}`,
}));

export const TldrIcon = styled(Box, {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "positive" | "negative" }>(({ tone }) => ({
  color: TONE_COLORS[tone].main,
  display: "flex",
  alignItems: "center",
  marginTop: 1,
  flexShrink: 0,
}));

export const TldrText = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "positive" | "negative" }>(({ tone }) => ({
  fontSize: "0.85rem",
  fontWeight: 500,
  lineHeight: 1.4,
  color: TONE_COLORS[tone].main,
}));

export const EmptyTldr = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 14,
  border: `1px dashed ${theme.palette.divider}`,
  textAlign: "center",
  fontSize: "0.8rem",
  color: theme.palette.text.secondary,
}));
