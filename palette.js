const getContrastText = (hex) => {
  const color = hex.replace("#", "");

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // luminance hesaplama (WCAG standardı)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance > 186 ? "#000000" : "#FFFFFF";
};

export const colorPalette = {
  app: {
    background: "#F4F7FB",
    surface: "#FFFFFF",
    surfaceSoft: "#EEF5FA",
    primary: "#3454D1",
    primarySoft: "#DDE6FF",
    text: "#192238",
    mutedText: "#647089",
    border: "#D7DFEA",
  },
  score: {
    low: "#D93636",
    medium: "#2878D8",
    good: "#51A86B",
    excellent: "#137D3B",
    empty: "#C8D0DC",
  },
  pink: {
    base: "#F9B2D7",
    light: "#FCD0E8",
    text: getContrastText("#F9B2D7"),
  },
  skyBlue: {
    base: "#CFECF3",
    light: "#E3F6FA",
    text: getContrastText("#CFECF3"),
  },
  mintGreen: {
    base: "#DAF9DE",
    light: "#ECFDF0",
    text: getContrastText("#DAF9DE"),
  },
  softYellow: {
    base: "#F6FFDC",
    light: "#FBFFE9",
    text: getContrastText("#F6FFDC"),
  },

  black: {
    base: "#000000",
    soft: "#2C2C2C",
    text: "#FFFFFF",
  },

  white: {
    base: "#FFFFFF",
    soft: "#F2F2F2",
    text: "#000000",
  },
};
