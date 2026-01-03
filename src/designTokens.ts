// ====================================================================
// GLOBAL UI DESIGN TOKENS
// ====================================================================
// This file contains all design tokens for consistent UI across the application.
// Use these tokens instead of hardcoded values for colors, spacing, etc.

// ====================================================================
// COLOR PALETTE
// ====================================================================

export const colors = {
  // Primary Colors
  primary: {
    navy: '#0A2540',
  },

  // Secondary Colors
  secondary: {
    slateBlue: '#3A4F7A',
  },

  // Background Colors
  background: {
    offWhite: '#F8F9FB',
  },

  // Text Colors
  text: {
    charcoal: '#1F2933',
  },

  // Accent Colors (for CTAs and interactive elements)
  accent: {
    mutedBlue: '#2563EB',
  },

  // Semantic Colors (for status, alerts, etc.)
  semantic: {
    success: '#10B981', // Green for approved/positive states
    warning: '#F59E0B', // Yellow for pending/warning states
    error: '#EF4444',   // Red for errors/danger
    info: '#3B82F6',    // Blue for informational states
  },

  // Neutral Colors (grays for borders, backgrounds, etc.)
  neutral: {
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },

  // Transparent overlays
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    dark: 'rgba(0, 0, 0, 0.5)',
    modal: 'rgba(0, 0, 0, 0.8)',
  },
};

// ====================================================================
// TYPOGRAPHY SCALE (Optional - can be expanded)
// ====================================================================

export const typography = {
  fontFamily: {
    primary: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Monaco, Consolas, monospace',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
};

// ====================================================================
// SPACING SCALE (Optional - can be expanded)
// ====================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
};

// ====================================================================
// BORDER RADIUS (Optional - can be expanded)
// ====================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// ====================================================================
// SHADOWS (Optional - can be expanded)
// ====================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// ====================================================================
// BREAKPOINTS (Optional - can be expanded)
// ====================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ====================================================================
// Z-INDEX SCALE (Optional - can be expanded)
// ====================================================================

export const zIndex = {
  auto: 'auto',
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
};

// ====================================================================
// ANIMATION DURATIONS (Optional - can be expanded)
// ====================================================================

export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ====================================================================
// USAGE EXAMPLES
// ====================================================================

/*
Import and use these tokens in your components:

import { colors, spacing, typography } from '@/designTokens';

// In your component styles:
const buttonStyles = {
  backgroundColor: colors.accent.mutedBlue,
  color: colors.neutral.gray50,
  padding: `${spacing[3]} ${spacing[4]}`,
  fontSize: typography.fontSize.base,
  fontWeight: typography.fontWeight.medium,
  borderRadius: borderRadius.md,
  boxShadow: shadows.base,
};

const cardStyles = {
  backgroundColor: colors.background.offWhite,
  border: `1px solid ${colors.neutral.gray200}`,
  borderRadius: borderRadius.lg,
  boxShadow: shadows.sm,
};
*/
