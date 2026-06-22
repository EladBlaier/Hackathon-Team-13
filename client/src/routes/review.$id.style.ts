import { styled, alpha } from "@mui/material/styles";
import { Box, IconButton, TextField } from "@mui/material";

export const PageRoot = styled(Box)({
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
});

export const ScrollArea = styled(Box)({
  flex: 1,
  overflowY: "auto",
});

export const ScrollInner = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(3, 2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

export const InfoBanner = styled(Box)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
  borderRadius: 16,
  padding: theme.spacing(1.5),
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "flex-start",
  fontSize: "0.75rem",
  color: theme.palette.primary.dark,
}));

export const Row = styled(Box, {
  shouldForwardProp: (p) => p !== "isStudent",
})<{ isStudent: boolean }>(({ isStudent }) => ({
  display: "flex",
  justifyContent: isStudent ? "flex-end" : "flex-start",
}));

export const BubbleStack = styled(Box, {
  shouldForwardProp: (p) => p !== "isStudent",
})<{ isStudent: boolean }>(({ isStudent }) => ({
  maxWidth: "85%",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  alignItems: isStudent ? "flex-end" : "flex-start",
}));

export const ImageGrid = styled(Box, {
  shouldForwardProp: (p) => p !== "multi",
})<{ multi: boolean }>(({ multi }) => ({
  display: "grid",
  gridTemplateColumns: multi ? "1fr 1fr" : "1fr",
  gap: 6,
}));

export const BubbleImage = styled("img")(({ theme }) => ({
  borderRadius: 16,
  maxHeight: 224,
  width: "100%",
  objectFit: "cover",
  border: `1px solid ${theme.palette.divider}`,
}));

export const Bubble = styled(Box, {
  shouldForwardProp: (p) => p !== "isStudent",
})<{ isStudent: boolean }>(({ theme, isStudent }) => ({
  borderRadius: 18,
  borderBottomRightRadius: isStudent ? 6 : 18,
  borderBottomLeftRadius: isStudent ? 18 : 6,
  padding: theme.spacing(1.25, 2),
  fontSize: "0.875rem",
  lineHeight: 1.5,
  backgroundColor: isStudent ? theme.palette.primary.main : theme.palette.background.paper,
  color: isStudent ? theme.palette.primary.contrastText : theme.palette.text.primary,
  border: isStudent ? "none" : `1px solid ${theme.palette.divider}`,
  direction: isStudent ? "ltr" : "rtl",
  textAlign: isStudent ? "left" : "right",
}));

export const TypingBubbleEl = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 18,
  borderBottomLeftRadius: 6,
  padding: theme.spacing(1.25, 2),
  display: "inline-flex",
  gap: 4,
  "& span": {
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: alpha(theme.palette.text.secondary, 0.6),
    animation: "bounce 1.2s infinite ease-in-out",
  },
  "& span:nth-of-type(1)": { animationDelay: "-0.24s" },
  "& span:nth-of-type(2)": { animationDelay: "-0.12s" },
  "@keyframes bounce": {
    "0%, 80%, 100%": { transform: "translateY(0)" },
    "40%": { transform: "translateY(-4px)" },
  },
}));

export const Composer = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

export const ComposerInner = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(1.5),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

export const PendingStrip = styled(Box)({
  display: "flex",
  gap: 8,
  overflowX: "auto",
  paddingBottom: 4,
});

export const PendingThumb = styled(Box)({
  position: "relative",
  width: 64,
  height: 64,
  borderRadius: 8,
  overflow: "hidden",
  flexShrink: 0,
});

export const PendingImg = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const PendingRemove = styled(IconButton)({
  position: "absolute",
  top: 2,
  right: 2,
  width: 20,
  height: 20,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  color: "#fff",
  fontSize: 12,
  "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.85)" },
});

export const ComposerRow = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
});

export const IconBtn = styled(IconButton)(({ theme }) => ({
  width: 40,
  height: 40,
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.secondary,
  "&:hover": { backgroundColor: theme.palette.action.selected },
}));

export const MessageField = styled(TextField)({
  flex: 1,
  "& .MuiOutlinedInput-root": {
    borderRadius: 20,
  },
});

export const HiddenInput = styled("input")({ display: "none" });
