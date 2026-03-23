// shared/font-list.js
// Canonical font catalogue: bundled accessibility fonts + common system fonts

const BUNDLED_FONTS = [
  {
    id: "opendyslexic",
    name: "OpenDyslexic",
    label: "OpenDyslexic (dyslexia-friendly)",
    files: {
      regular: "fonts/bundled/OpenDyslexic-Regular.otf",
      bold: "fonts/bundled/OpenDyslexic-Bold.otf",
      italic: "fonts/bundled/OpenDyslexic-Italic.otf",
      boldItalic: "fonts/bundled/OpenDyslexic-BoldItalic.otf",
    },
  },
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible",
    label: "Atkinson Hyperlegible (low vision)",
    files: {
      regular: "fonts/bundled/AtkinsonHyperlegible-Regular.woff2",
      bold: "fonts/bundled/AtkinsonHyperlegible-Bold.woff2",
    },
  },
  {
    id: "lexend",
    name: "Lexend",
    label: "Lexend (reduces visual stress)",
    files: {
      regular: "fonts/bundled/Lexend-Regular.woff2",
    },
  },
];

const SYSTEM_FONTS = [
  // Sans-serif
  { id: "arial", name: "Arial", label: "Arial", stack: "Arial, sans-serif" },
  {
    id: "helvetica",
    name: "Helvetica Neue",
    label: "Helvetica Neue",
    stack: '"Helvetica Neue", Helvetica, sans-serif',
  },
  {
    id: "verdana",
    name: "Verdana",
    label: "Verdana",
    stack: "Verdana, sans-serif",
  },
  {
    id: "tahoma",
    name: "Tahoma",
    label: "Tahoma",
    stack: "Tahoma, sans-serif",
  },
  {
    id: "trebuchet",
    name: "Trebuchet MS",
    label: "Trebuchet MS",
    stack: '"Trebuchet MS", sans-serif',
  },
  {
    id: "calibri",
    name: "Calibri",
    label: "Calibri",
    stack: "Calibri, sans-serif",
  },
  {
    id: "segoe",
    name: "Segoe UI",
    label: "Segoe UI",
    stack: '"Segoe UI", sans-serif',
  },
  {
    id: "roboto",
    name: "Roboto",
    label: "Roboto",
    stack: "Roboto, sans-serif",
  },
  {
    id: "opensans",
    name: "Open Sans",
    label: "Open Sans",
    stack: '"Open Sans", sans-serif',
  },
  // Serif
  {
    id: "times",
    name: "Times New Roman",
    label: "Times New Roman",
    stack: '"Times New Roman", Times, serif',
  },
  { id: "georgia", name: "Georgia", label: "Georgia", stack: "Georgia, serif" },
  {
    id: "palatino",
    name: "Palatino",
    label: "Palatino Linotype",
    stack: '"Palatino Linotype", Palatino, serif',
  },
  // Monospace
  {
    id: "courier",
    name: "Courier New",
    label: "Courier New",
    stack: '"Courier New", Courier, monospace',
  },
  {
    id: "consolaas",
    name: "Consolas",
    label: "Consolas",
    stack: "Consolas, monospace",
  },
  // Wide / dyslexia-helpful system fonts
  {
    id: "comicsans",
    name: "Comic Sans MS",
    label: "Comic Sans MS",
    stack: '"Comic Sans MS", cursive',
  },
  {
    id: "biancoenero",
    name: "Bianco Nero",
    label: "Bianco Nero",
    stack: '"Bianco Nero", sans-serif',
  },
];

// Combined list used in the font picker (bundled first, then system)
const ALL_FONTS = [
  ...BUNDLED_FONTS.map((f) => ({ ...f, category: "bundled" })),
  ...SYSTEM_FONTS.map((f) => ({ ...f, category: "system" })),
];
