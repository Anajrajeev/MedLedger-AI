// Theme configuration and utilities for consistent styling

export const theme = {
  colors: {
    medical: {
      blue: "#2D8DFE",
      teal: "#00B8A9",
      lightBlue: "#F0F9FF",
      darkBlue: "#0C4A6E",
    },
    glass: {
      white: "rgba(255, 255, 255, 0.7)",
      whiteLight: "rgba(255, 255, 255, 0.4)",
      border: "rgba(255, 255, 255, 0.5)",
    },
  },
  gradients: {
    medical: "linear-gradient(135deg, #2D8DFE 0%, #00B8A9 100%)",
    background: "linear-gradient(to bottom right, #F0F9FF, #FFFFFF, #E0F2FE)",
    glass: "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.3))",
  },
  shadows: {
    soft: "0 4px 6px -1px rgba(45, 141, 254, 0.1), 0 2px 4px -1px rgba(45, 141, 254, 0.06)",
    medium: "0 10px 15px -3px rgba(45, 141, 254, 0.1), 0 4px 6px -2px rgba(45, 141, 254, 0.05)",
    large: "0 20px 25px -5px rgba(45, 141, 254, 0.1), 0 10px 10px -5px rgba(45, 141, 254, 0.04)",
  },
  blur: {
    glass: "12px",
    strong: "24px",
  },
  spacing: {
    section: "3rem",
    card: "2rem",
    element: "1rem",
  },
  borderRadius: {
    small: "0.5rem",
    medium: "0.75rem",
    large: "1rem",
    xl: "1.5rem",
  },
} as const;

// Animation variants for Framer Motion
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// Transition presets
export const transitions = {
  spring: {
    type: "spring",
    stiffness: 300,
    damping: 30,
  },
  smooth: {
    duration: 0.3,
    ease: "easeInOut",
  },
  slow: {
    duration: 0.5,
    ease: "easeOut",
  },
} as const;

// Helper function to generate consistent glass card styles
export function getGlassCardStyles(intensity: "light" | "medium" | "strong" = "medium") {
  const intensityMap = {
    light: "bg-white/50 backdrop-blur-sm",
    medium: "bg-white/70 backdrop-blur-xl",
    strong: "bg-white/80 backdrop-blur-2xl",
  };

  return `${intensityMap[intensity]} border border-white/50 shadow-lg shadow-medical-blue/5 rounded-2xl`;
}

// Responsive breakpoints
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

