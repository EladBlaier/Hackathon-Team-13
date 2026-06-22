import { styled } from "@mui/material/styles";
import { Box, Paper } from "@mui/material";

export const PageRoot = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  backgroundColor: theme.palette.background.default,
}));

export const Main = styled(Box)(({ theme }) => ({
  maxWidth: 640,
  margin: "0 auto",
  padding: theme.spacing(3, 2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
}));

export const StudentCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2, 2.5),
  borderRadius: 16,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
}));

export const EmptyBox = styled(Box)(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(6, 2),
  color: theme.palette.text.secondary,
}));
