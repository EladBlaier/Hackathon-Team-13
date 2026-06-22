import { styled, alpha } from "@mui/material/styles";
import { Box, Paper, InputBase } from "@mui/material";

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

export const SearchBar = styled(Paper)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1.5),
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(3),
}));

export const SearchInput = styled(InputBase)({
  flex: 1,
  fontSize: "0.9rem",
});

export const SectionHead = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: theme.spacing(1.5),
}));

export const StudentList = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

export const StudentRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5, 2),
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  cursor: "pointer",
  transition: "background-color 150ms ease, transform 150ms ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    transform: "translateY(-1px)",
  },
}));

export const StudentAvatar = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  backgroundColor: alpha(theme.palette.primary.main, 0.12),
  color: theme.palette.primary.main,
}));

export const StudentInfo = styled(Box)({
  flex: 1,
  minWidth: 0,
});

export const StudentIdText = styled("div")({
  fontWeight: 600,
  fontSize: "0.9rem",
});

export const StudentSub = styled("div")(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
}));

export const EmptyCard = styled(Paper)(({ theme }) => ({
  border: `1px dashed ${theme.palette.divider}`,
  borderRadius: 20,
  padding: theme.spacing(4),
  textAlign: "center",
  boxShadow: "none",
}));

export const ClassReviewBar = styled(Box)(({ theme }) => ({
  position: "fixed",
  insetInline: 0,
  bottom: 0,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  boxShadow: "0 -8px 24px -12px rgba(0,0,0,0.18)",
  zIndex: 30,
}));

export const ClassReviewInner = styled(Box)(({ theme }) => ({
  maxWidth: 672,
  margin: "0 auto",
  padding: theme.spacing(1.5, 2),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const ClassReviewLabel = styled(Box)({
  flex: 1,
  minWidth: 0,
});

export const ClassReviewTitle = styled("div")({
  fontWeight: 600,
  fontSize: "0.875rem",
});

export const ClassReviewSub = styled("div")(({ theme }) => ({
  fontSize: "0.7rem",
  color: theme.palette.text.secondary,
}));
