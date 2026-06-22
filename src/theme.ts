import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#5b4bd1", contrastText: "#ffffff" },
    secondary: { main: "#f5efe2", contrastText: "#2a2453" },
    success: { main: "#3fb98a" },
    warning: { main: "#e8a23a" },
    error: { main: "#e35d4f" },
    background: { default: "#faf6ec", paper: "#ffffff" },
    text: { primary: "#22204a", secondary: "#6b6890" },
    divider: "#ece6d4",
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small", fullWidth: true },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});

export default theme;

declare module "@mui/material/styles" {
  interface Palette {
    accent?: Palette["primary"];
  }
  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
  }
}