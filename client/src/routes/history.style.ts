import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";

export const PageRoot = styled(Box)({
  minHeight: "100vh",
  paddingBottom: 48,
});

export const Main = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(3, 2, 0),
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

export const EmptyText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  color: theme.palette.text.secondary,
  padding: theme.spacing(6, 0),
}));