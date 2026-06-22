import { styled, alpha } from "@mui/material/styles";
import { Box, IconButton } from "@mui/material";

export const PageRoot = styled(Box)({
  minHeight: "100vh",
  paddingBottom: 128,
});

export const Main = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(3, 2, 0),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
}));

export const FieldGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

export const PhotoGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: theme.spacing(1),
}));

export const Thumb = styled(Box)(({ theme }) => ({
  position: "relative",
  aspectRatio: "1 / 1",
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: theme.palette.action.hover,
}));

export const ThumbImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const RemoveBtn = styled(IconButton)({
  position: "absolute",
  top: 4,
  right: 4,
  width: 24,
  height: 24,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: "#fff",
  "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.8)" },
});

export const PickerTile = styled("button", {
  shouldForwardProp: (p) => p !== "primary",
})<{ primary?: boolean }>(({ theme, primary }) => ({
  cursor: "pointer",
  aspectRatio: "1 / 1",
  borderRadius: 12,
  border: `2px dashed ${primary ? alpha(theme.palette.primary.main, 0.4) : theme.palette.divider}`,
  backgroundColor: primary
    ? alpha(theme.palette.primary.main, 0.05)
    : "transparent",
  color: primary ? theme.palette.primary.main : theme.palette.text.secondary,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  fontFamily: "inherit",
  fontSize: "0.75rem",
  fontWeight: 500,
  transition: "background-color 150ms ease",
  "&:hover": {
    backgroundColor: primary
      ? alpha(theme.palette.primary.main, 0.1)
      : theme.palette.action.hover,
  },
}));

export const HiddenInput = styled("input")({ display: "none" });

export const SubmitBar = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: 0,
  insetInline: 0,
  backgroundColor: alpha(theme.palette.background.default, 0.9),
  backdropFilter: "blur(10px)",
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const SubmitInner = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(2),
}));