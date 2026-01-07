export const theme = {
  colors: {
    // brand
    primary: '#5E7844',
    primaryDark: '#2F4A1E',
    primaryLight: '#B9C7A8',

    // surfaces
    bg: '#E9E4D6',
    bgLight: '#F5F1E6',
    surface: '#F7F3E8',

    // text
    text: '#1C1C1C',
    textMuted: '#6B6B63',
    textOnPrimary: '#F5F1E6',

    // borders/dividers
    borderNeutral: '#CFC8B7',
    borderStrong: '#AFA793',
    borderGreen: '#A9B79A',
    dividerSoft: '#DDD6C7',

    // icons
    icon: '#1C1C1C',
    iconOnPrimary: '#F5F1E6',
    iconMutedOnPrimary: 'rgba(245,241,230,0.75)',

    // feedback
    error: '#B04A4A',
    errorBg: '#F7E3E3',
  },

  spacing: {
    s1: 4,
    s2: 8,
    s3: 12,
    s4: 16,
    s5: 20,
    s6: 24,
  },

  radius: {
    sm: 10,
    md: 14,
    pill: 999,
  },

  typography: {
    screenTitle: { fontSize: 22, fontWeight: '800' as const },
    h2: { fontSize: 18, fontWeight: '700' as const },
    body: { fontSize: 16, fontWeight: '500' as const },
    label: { fontSize: 13, fontWeight: '700' as const },
    hint: { fontSize: 12, fontWeight: '500' as const },
  },
};
