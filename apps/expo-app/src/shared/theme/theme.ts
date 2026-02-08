export type ThemeName =
  | 'default'
  | 'forest'
  | 'sage'
  | 'clay'
  | 'latte'
  | 'alpine'
  | 'midnight'
  | 'matcha'
  | 'graphite'
  | 'espresso'
  | 'aero'
  | 'mars'
  | 'rose'
  | 'lavender'
  | 'expedition'
  | 'pink';

export type Theme = {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    bg: string;
    bgLight: string;
    surface: string;
    text: string;
    textMuted: string;
    textOnPrimary: string;
    headerBg: string;
    headerText: string;
    tabBarBg: string;
    tabBarText: string;
    tabBarAccent: string;
    tabBarNotchFill: string;
    tabBarAddButtonBg: string;
    tabBarAddButtonIcon: string;
    borderNeutral: string;
    borderStrong: string;
    borderGreen: string;
    dividerSoft: string;
    icon: string;
    iconOnPrimary: string;
    iconMutedOnPrimary: string;
    error: string;
    errorBg: string;
    successBanner: string;
  };
  spacing: {
    s1: number;
    s2: number;
    s3: number;
    s4: number;
    s5: number;
    s6: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  typography: {
    screenTitle: { fontSize: number; fontWeight: '800' };
    h2: { fontSize: number; fontWeight: '700' };
    body: { fontSize: number; fontWeight: '500' };
    label: { fontSize: number; fontWeight: '700' };
    hint: { fontSize: number; fontWeight: '500' };
  };
};

const base = {
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
    lg: 20,
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

export const THEMES: Record<ThemeName, Theme> = {
  default: {
    colors: {
      primary: '#5E7844',
      primaryDark: '#2F4A1E',
      primaryLight: '#B9C7A8',
      bg: '#EDE8D0',
      bgLight: '#F7F5EB',
      surface: '#F7F5EB',
      text: '#1C1C1C',
      textMuted: '#6B6B63',
      textOnPrimary: '#F5F1E6',
      headerBg: '#5E7844',
      headerText: '#F5F1E6',
      tabBarBg: '#5E7844',
      tabBarText: '#F5F1E6',
      tabBarAccent: '#F5F1E6',
      tabBarNotchFill: '#EDE8D0',
      tabBarAddButtonBg: '#5E7844',
      tabBarAddButtonIcon: '#F5F1E6',
      borderNeutral: '#CFC8B7',
      borderStrong: '#AFA793',
      borderGreen: '#A9B79A',
      dividerSoft: '#DDD6C7',
      icon: '#1C1C1C',
      iconOnPrimary: '#F5F1E6',
      iconMutedOnPrimary: 'rgba(245,241,230,0.75)',
      error: '#B04A4A',
      errorBg: '#F7E3E3',
      successBanner: '#E3F3E6',
    },
    ...base,
  },
  forest: {
    colors: {
      primary: '#2F6B3E',
      primaryDark: '#1D3E26',
      primaryLight: '#9FCAA9',
      bg: '#E1E9D9',
      bgLight: '#F0F4EC',
      surface: '#F0F4EC',
      text: '#1E2A22',
      textMuted: '#5D6B62',
      textOnPrimary: '#F1F6F2',
      headerBg: '#2F6B3E',
      headerText: '#F1F6F2',
      tabBarBg: '#E1E9D9',
      tabBarText: '#1D3E26',
      tabBarAccent: '#2F6B3E',
      tabBarNotchFill: '#E1E9D9',
      tabBarAddButtonBg: '#2F6B3E',
      tabBarAddButtonIcon: '#F1F6F2',
      borderNeutral: '#C2D0C5',
      borderStrong: '#9EB1A3',
      borderGreen: '#7FAA8A',
      dividerSoft: '#D3DED3',
      icon: '#1E2A22',
      iconOnPrimary: '#F1F6F2',
      iconMutedOnPrimary: 'rgba(241,246,242,0.75)',
      error: '#B05B4A',
      errorBg: '#F6E5E1',
      successBanner: '#DDEEE1',
    },
    ...base,
  },
  sage: {
    colors: {
      primary: '#6C8C7C',
      primaryDark: '#3C5B4D',
      primaryLight: '#C2D3C9',
      bg: '#E3E8E4',
      bgLight: '#F3F6F4',
      surface: '#F3F6F4',
      text: '#1F2B26',
      textMuted: '#6A766F',
      textOnPrimary: '#F7FAF8',
      headerBg: '#6C8C7C',
      headerText: '#F7FAF8',
      tabBarBg: '#E3E8E4',
      tabBarText: '#3C5B4D',
      tabBarAccent: '#6C8C7C',
      tabBarNotchFill: '#E3E8E4',
      tabBarAddButtonBg: '#6C8C7C',
      tabBarAddButtonIcon: '#F7FAF8',
      borderNeutral: '#CAD5CF',
      borderStrong: '#AAB8B0',
      borderGreen: '#9FB3A8',
      dividerSoft: '#D8E0DB',
      icon: '#1F2B26',
      iconOnPrimary: '#F7FAF8',
      iconMutedOnPrimary: 'rgba(247,250,248,0.75)',
      error: '#B05B4A',
      errorBg: '#F6E5E1',
      successBanner: '#E3F0EA',
    },
    ...base,
  },
  clay: {
    colors: {
      primary: '#B26A4C',
      primaryDark: '#7E3E25',
      primaryLight: '#E2C0AE',
      bg: '#F1E3D6',
      bgLight: '#FAF3EC',
      surface: '#FAF3EC',
      text: '#2C1E18',
      textMuted: '#7D6A60',
      textOnPrimary: '#FFF6EE',
      headerBg: '#B26A4C',
      headerText: '#FFF6EE',
      tabBarBg: '#F1E3D6',
      tabBarText: '#7E3E25',
      tabBarAccent: '#B26A4C',
      tabBarNotchFill: '#F1E3D6',
      tabBarAddButtonBg: '#B26A4C',
      tabBarAddButtonIcon: '#FFF6EE',
      borderNeutral: '#D9C6B8',
      borderStrong: '#BCA493',
      borderGreen: '#CDB3A1',
      dividerSoft: '#E6D7CC',
      icon: '#2C1E18',
      iconOnPrimary: '#FFF6EE',
      iconMutedOnPrimary: 'rgba(255,246,238,0.75)',
      error: '#B04A4A',
      errorBg: '#F7E3E3',
      successBanner: '#E7F2E5',
    },
    ...base,
  },
  latte: {
    colors: {
      primary: '#8B5A2B',
      primaryDark: '#5A381C',
      primaryLight: '#D4B08A',
      bg: '#D8C2A5',
      bgLight: '#F0E2D0',
      surface: '#F0E2D0',
      text: '#2E1D12',
      textMuted: '#6E5C51',
      textOnPrimary: '#FFF2E3',
      headerBg: '#8B5A2B',
      headerText: '#FFF2E3',
      tabBarBg: '#D8C2A5',
      tabBarText: '#5A381C',
      tabBarAccent: '#8B5A2B',
      tabBarNotchFill: '#D8C2A5',
      tabBarAddButtonBg: '#8B5A2B',
      tabBarAddButtonIcon: '#FFF2E3',
      borderNeutral: '#C7B095',
      borderStrong: '#A58B6F',
      borderGreen: '#B59B84',
      dividerSoft: '#D6C2AC',
      icon: '#2E1D12',
      iconOnPrimary: '#FFF2E3',
      iconMutedOnPrimary: 'rgba(255,242,227,0.75)',
      error: '#B04A4A',
      errorBg: '#F7E3E3',
      successBanner: '#E9EFE4',
    },
    ...base,
  },
  alpine: {
    colors: {
      primary: '#5A8FA6',
      primaryDark: '#2E5E73',
      primaryLight: '#B9D2DE',
      bg: '#DDEBF1',
      bgLight: '#F2F7FA',
      surface: '#F2F7FA',
      text: '#1C2B33',
      textMuted: '#60717A',
      textOnPrimary: '#F7FBFD',
      headerBg: '#5A8FA6',
      headerText: '#F7FBFD',
      tabBarBg: '#DDEBF1',
      tabBarText: '#2E5E73',
      tabBarAccent: '#5A8FA6',
      tabBarNotchFill: '#DDEBF1',
      tabBarAddButtonBg: '#5A8FA6',
      tabBarAddButtonIcon: '#F7FBFD',
      borderNeutral: '#C9D8DF',
      borderStrong: '#A9BDC7',
      borderGreen: '#A7C1C9',
      dividerSoft: '#D5E2E8',
      icon: '#1C2B33',
      iconOnPrimary: '#F7FBFD',
      iconMutedOnPrimary: 'rgba(247,251,253,0.75)',
      error: '#B05B4A',
      errorBg: '#F6E5E1',
      successBanner: '#E0F1F0',
    },
    ...base,
  },
  midnight: {
    colors: {
      primary: '#2F7C6E',
      primaryDark: '#19534A',
      primaryLight: '#A6CFC6',
      bg: '#141817',
      bgLight: '#1D2321',
      surface: '#1D2321',
      text: '#EDEBE4',
      textMuted: '#A8A49A',
      textOnPrimary: '#F2F7F4',
      headerBg: '#1D2321',
      headerText: '#EDEBE4',
      tabBarBg: '#1D2321',
      tabBarText: '#EDEBE4',
      tabBarAccent: '#2F7C6E',
      tabBarNotchFill: '#1D2321',
      tabBarAddButtonBg: '#2F7C6E',
      tabBarAddButtonIcon: '#F2F7F4',
      borderNeutral: '#2C3431',
      borderStrong: '#3B463F',
      borderGreen: '#2B4B43',
      dividerSoft: '#2A322F',
      icon: '#EDEBE4',
      iconOnPrimary: '#F2F7F4',
      iconMutedOnPrimary: 'rgba(242,247,244,0.75)',
      error: '#D07B7B',
      errorBg: '#3A2323',
      successBanner: '#1F3127',
    },
    ...base,
  },
  matcha: {
    colors: {
      primary: '#677A6B',
      primaryDark: '#425347',
      primaryLight: '#BFC8C1',
      bg: '#E2D2B8',
      bgLight: '#EFE6D6',
      surface: '#EFE6D6',
      text: '#2A302B',
      textMuted: '#6F756F',
      textOnPrimary: '#F3F2EC',
      headerBg: '#677A6B',
      headerText: '#F3F2EC',
      tabBarBg: '#E2D2B8',
      tabBarText: '#425347',
      tabBarAccent: '#677A6B',
      tabBarNotchFill: '#E2D2B8',
      tabBarAddButtonBg: '#677A6B',
      tabBarAddButtonIcon: '#F3F2EC',
      borderNeutral: '#D2C5AE',
      borderStrong: '#B7A88E',
      borderGreen: '#9DAA9E',
      dividerSoft: '#E0D5C1',
      icon: '#2A302B',
      iconOnPrimary: '#F3F2EC',
      iconMutedOnPrimary: 'rgba(243,242,236,0.75)',
      error: '#B05B4A',
      errorBg: '#F6E5E1',
      successBanner: '#E5EFE9',
    },
    ...base,
  },
  graphite: {
    colors: {
      primary: '#C7C8CA',
      primaryDark: '#8D8F92',
      primaryLight: '#E7E8EA',
      bg: '#1C1D21',
      bgLight: '#24262B',
      surface: '#24262B',
      text: '#F0F1F3',
      textMuted: '#A9ABB0',
      textOnPrimary: '#1C1D21',
      headerBg: '#24262B',
      headerText: '#F0F1F3',
      tabBarBg: '#24262B',
      tabBarText: '#F0F1F3',
      tabBarAccent: '#C7C8CA',
      tabBarNotchFill: '#24262B',
      tabBarAddButtonBg: '#C7C8CA',
      tabBarAddButtonIcon: '#1C1D21',
      borderNeutral: '#2F3238',
      borderStrong: '#3B3E45',
      borderGreen: '#3A4240',
      dividerSoft: '#2A2D33',
      icon: '#F0F1F3',
      iconOnPrimary: '#1C1D21',
      iconMutedOnPrimary: 'rgba(28,29,33,0.75)',
      error: '#D07B7B',
      errorBg: '#3A2323',
      successBanner: '#24302D',
    },
    ...base,
  },
  espresso: {
    colors: {
      primary: '#6E4B2C',
      primaryDark: '#3D2618',
      primaryLight: '#BCA184',
      bg: '#12100F',
      bgLight: '#1A1716',
      surface: '#1A1716',
      text: '#F1EAE4',
      textMuted: '#A2968C',
      textOnPrimary: '#FAF4EE',
      headerBg: '#1A1716',
      headerText: '#F1EAE4',
      tabBarBg: '#1A1716',
      tabBarText: '#F1EAE4',
      tabBarAccent: '#6E4B2C',
      tabBarNotchFill: '#1A1716',
      tabBarAddButtonBg: '#6E4B2C',
      tabBarAddButtonIcon: '#FAF4EE',
      borderNeutral: '#2B2624',
      borderStrong: '#3A332F',
      borderGreen: '#2E2A28',
      dividerSoft: '#221E1C',
      icon: '#F1EAE4',
      iconOnPrimary: '#FAF4EE',
      iconMutedOnPrimary: 'rgba(250,244,238,0.7)',
      error: '#D07B7B',
      errorBg: '#3A2323',
      successBanner: '#1E241F',
    },
    ...base,
  },
  aero: {
    colors: {
      primary: '#8EBBFF',
      primaryDark: '#5F8FD8',
      primaryLight: '#C6DCFF',
      bg: '#24293E',
      bgLight: '#2E3550',
      surface: '#2A3048',
      text: '#F4F5FC',
      textMuted: '#B8C0D8',
      textOnPrimary: '#101523',
      headerBg: '#1F2436',
      headerText: '#F4F5FC',
      tabBarBg: '#1F2436',
      tabBarText: '#F4F5FC',
      tabBarAccent: '#8EBBFF',
      tabBarNotchFill: '#1F2436',
      tabBarAddButtonBg: '#8EBBFF',
      tabBarAddButtonIcon: '#101523',
      borderNeutral: '#343C5A',
      borderStrong: '#3E4769',
      borderGreen: '#3B4A6A',
      dividerSoft: '#2E3652',
      icon: '#F4F5FC',
      iconOnPrimary: '#101523',
      iconMutedOnPrimary: 'rgba(16,21,35,0.7)',
      error: '#D87979',
      errorBg: '#3B2A2A',
      successBanner: '#223149',
    },
    ...base,
  },
  mars: {
    colors: {
      primary: '#E67A4E',
      primaryDark: '#B4522D',
      primaryLight: '#F3B18E',
      bg: '#161514',
      bgLight: '#1F1D1C',
      surface: '#1F1D1C',
      text: '#F2E9E4',
      textMuted: '#B8A79D',
      textOnPrimary: '#24150E',
      headerBg: '#0F0E0D',
      headerText: '#F2E9E4',
      tabBarBg: '#0F0E0D',
      tabBarText: '#F2E9E4',
      tabBarAccent: '#E67A4E',
      tabBarNotchFill: '#0F0E0D',
      tabBarAddButtonBg: '#E67A4E',
      tabBarAddButtonIcon: '#24150E',
      borderNeutral: '#2A2726',
      borderStrong: '#3A3430',
      borderGreen: '#3E2C24',
      dividerSoft: '#242120',
      icon: '#F2E9E4',
      iconOnPrimary: '#24150E',
      iconMutedOnPrimary: 'rgba(36,21,14,0.7)',
      error: '#D07B7B',
      errorBg: '#3A2323',
      successBanner: '#222520',
    },
    ...base,
  },
  rose: {
    colors: {
      primary: '#F0628C',
      primaryDark: '#B84364',
      primaryLight: '#F6A0B6',
      bg: '#2A2A2A',
      bgLight: '#323232',
      surface: '#323232',
      text: '#F5F3F4',
      textMuted: '#B9B3B6',
      textOnPrimary: '#2A0F18',
      headerBg: '#1E1E1E',
      headerText: '#F5F3F4',
      tabBarBg: '#1E1E1E',
      tabBarText: '#F5F3F4',
      tabBarAccent: '#F0628C',
      tabBarNotchFill: '#1E1E1E',
      tabBarAddButtonBg: '#F0628C',
      tabBarAddButtonIcon: '#2A0F18',
      borderNeutral: '#3C3C3C',
      borderStrong: '#4A4A4A',
      borderGreen: '#4A3A3E',
      dividerSoft: '#3A3A3A',
      icon: '#F5F3F4',
      iconOnPrimary: '#2A0F18',
      iconMutedOnPrimary: 'rgba(42,15,24,0.7)',
      error: '#D07B7B',
      errorBg: '#3A2323',
      successBanner: '#2E3532',
    },
    ...base,
  },
  lavender: {
    colors: {
      primary: '#A58AD6',
      primaryDark: '#7A5FB8',
      primaryLight: '#D6C9F0',
      bg: '#2B2454',
      bgLight: '#332B63',
      surface: '#342C66',
      text: '#F5F1FF',
      textMuted: '#C4B9E6',
      textOnPrimary: '#1E1433',
      headerBg: '#2B2454',
      headerText: '#F5F1FF',
      tabBarBg: '#2B2454',
      tabBarText: '#F5F1FF',
      tabBarAccent: '#B79AED',
      tabBarNotchFill: '#2B2454',
      tabBarAddButtonBg: '#B79AED',
      tabBarAddButtonIcon: '#1E1433',
      borderNeutral: '#3B2F6B',
      borderStrong: '#4A3B84',
      borderGreen: '#4A3B84',
      dividerSoft: '#362D5F',
      icon: '#F5F1FF',
      iconOnPrimary: '#1E1433',
      iconMutedOnPrimary: 'rgba(30,20,51,0.7)',
      error: '#D98989',
      errorBg: '#3B2331',
      successBanner: '#2B2D46',
    },
    ...base,
  },
  expedition: {
    colors: {
      primary: '#D3A15A',
      primaryDark: '#9C6A34',
      primaryLight: '#F1D0A1',
      bg: '#1F3335',
      bgLight: '#243C3E',
      surface: '#243C3E',
      text: '#E8E2D6',
      textMuted: '#A9A39A',
      textOnPrimary: '#2B1B0F',
      headerBg: '#1F3335',
      headerText: '#E8E2D6',
      tabBarBg: '#1F3335',
      tabBarText: '#E8E2D6',
      tabBarAccent: '#D3A15A',
      tabBarNotchFill: '#1F3335',
      tabBarAddButtonBg: '#D3A15A',
      tabBarAddButtonIcon: '#2B1B0F',
      borderNeutral: '#2B4649',
      borderStrong: '#35565A',
      borderGreen: '#2E4D4F',
      dividerSoft: '#2A4447',
      icon: '#E8E2D6',
      iconOnPrimary: '#2B1B0F',
      iconMutedOnPrimary: 'rgba(43,27,15,0.7)',
      error: '#D07B7B',
      errorBg: '#3A2323',
      successBanner: '#233739',
    },
    ...base,
  },
  pink: {
    colors: {
      primary: '#F6A6C8',
      primaryDark: '#E98FB6',
      primaryLight: '#FFDDED',
      bg: '#FFF7FB',
      bgLight: '#FFEFF6',
      surface: '#FFFCFD',
      text: '#5A3B48',
      textMuted: '#9E7B8A',
      textOnPrimary: '#3E1E2A',
      headerBg: '#FFDDED',
      headerText: '#5A3B48',
      tabBarBg: '#FFDDED',
      tabBarText: '#5A3B48',
      tabBarAccent: '#E98FB6',
      tabBarNotchFill: '#FFF7FB',
      tabBarAddButtonBg: '#F6A6C8',
      tabBarAddButtonIcon: '#3E1E2A',
      borderNeutral: '#F4D7E3',
      borderStrong: '#EEC3D4',
      borderGreen: '#F6CDDE',
      dividerSoft: '#F6E3EB',
      icon: '#5A3B48',
      iconOnPrimary: '#3E1E2A',
      iconMutedOnPrimary: 'rgba(62,30,42,0.7)',
      error: '#D88FA6',
      errorBg: '#FFE7F0',
      successBanner: '#FFF0F6',
    },
    ...base,
  },
};

export const DEFAULT_THEME_NAME: ThemeName = 'default';

export const getTheme = (name: ThemeName): Theme => THEMES[name] ?? THEMES.default;

export const isThemeName = (value: string): value is ThemeName =>
  value === 'default' ||
  value === 'forest' ||
  value === 'sage' ||
  value === 'clay' ||
  value === 'latte' ||
  value === 'alpine' ||
  value === 'midnight' ||
  value === 'matcha' ||
  value === 'graphite' ||
  value === 'espresso' ||
  value === 'aero' ||
  value === 'mars' ||
  value === 'rose' ||
  value === 'lavender' ||
  value === 'expedition' ||
  value === 'pink';
