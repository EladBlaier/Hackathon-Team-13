import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";

export const PageRoot = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
}));

export const Container = styled(Box)({
  width: "100%",
  maxWidth: 380,
});

export const Brand = styled(Box)(({ theme }) => ({
  textAlign: "center",
  marginBottom: theme.spacing(4),
}));

export const LogoMark = styled(Box)(({ theme }) => ({
  width: 64,
  height: 64,
  borderRadius: 24,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "2rem",
  fontWeight: 700,
  boxShadow: "0 12px 28px -8px rgba(91, 75, 209, 0.45)",
  marginBottom: theme.spacing(2),
}));

export const FormCard = styled("form")(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: 24,
  padding: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
}));

export const Hint = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  marginTop: theme.spacing(3),
  color: theme.palette.text.secondary,
  fontSize: "0.75rem",
}));