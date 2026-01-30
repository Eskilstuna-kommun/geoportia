import {
  createBaseThemeOptions,
  createUnifiedTheme,
  genPageTheme,
  palettes,
  shapes,
} from '@backstage/theme';

export const eskilstunaTheme = createUnifiedTheme({
  ...createBaseThemeOptions({
    palette: {
      ...palettes.light,
      primary: {
        main: '#823788',
      },
      secondary: {
        main: '#1bacb7',
      },
      error: {
        main: '#e42313',
      },
      warning: {
        main: '#ee7203',
      },
      info: {
        main: '#009ddf',
      },
      success: {
        main: '#5bb030',
      },
      background: {
        default: '#ffffff',
        paper: '#ffffff',
      },
      banner: {
        info: '#34548a',
        error: '#8c4351',
        text: '#343b58',
        link: '#565a6e',
      },
      errorBackground: '#8c4351',
      warningBackground: '#8f5e15',
      infoBackground: '#343b58',
      navigation: {
        background: '#ffffff',
        indicator: '#af84b6',
        color: '#000000',
        selectedColor: '#823788',
        navItem: {
          hoverBackground: '#e1d5e8',
        },
      },
    },
  }),
  defaultPageTheme: 'home',
  pageTheme: {
    home: genPageTheme({ colors: ['#823788'], shape: shapes.wave }),
  },
});
