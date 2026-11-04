/**
 * Official Tampermonkey mobile install QR landings (FAQ Q406).
 * SVG matrices encode https://www.tampermonkey.net/qr/{s|e|f}.
 */

export type TampermonkeyQrCard = {
  id: string;
  label: string;
  url: string;
  help: string;
  svg: string;
};

export const TAMPERMONKEY_QR_CARDS: readonly TampermonkeyQrCard[] = [
  {
    id: "ios",
    label: "iOS · Safari",
    url: "https://www.tampermonkey.net/qr/s",
    help: "App Store Tampermonkey",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 31 31\" shape-rendering=\"crispEdges\"><path fill=\"#ffffff\" d=\"M0 0h31v31H0z\"/><path stroke=\"#121212\" d=\"M1 1.5h7m1 0h1m1 0h2m3 0h2m1 0h3m1 0h7M1 2.5h1m5 0h1m1 0h1m1 0h1m3 0h2m1 0h2m3 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m2 0h1m2 0h4m2 0h1m3 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h1m2 0h1m4 0h2m1 0h1m2 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m3 0h1m2 0h1m4 0h2m2 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m4 0h2m1 0h1m4 0h1m2 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h1m2 0h1m1 0h2m2 0h3M1 9.5h1m1 0h2m1 0h3m1 0h6m1 0h2m4 0h1m2 0h1m1 0h2M1 10.5h3m2 0h1m2 0h2m1 0h1m3 0h6m1 0h3m3 0h1M3 11.5h1m1 0h3m2 0h4m1 0h2m2 0h1m2 0h1m1 0h2m1 0h2M2 12.5h1m1 0h2m4 0h3m1 0h3m4 0h1m1 0h3m3 0h1M4 13.5h2m1 0h1m3 0h3m4 0h1m1 0h1m5 0h2M1 14.5h3m1 0h2m4 0h2m1 0h1m5 0h1m2 0h2m2 0h3M1 15.5h4m2 0h2m1 0h1m2 0h1m1 0h1m2 0h4m1 0h3m1 0h3M1 16.5h1m2 0h3m3 0h2m2 0h1m4 0h1m1 0h1m2 0h2m2 0h1M1 17.5h1m2 0h1m1 0h8m3 0h1m1 0h4m2 0h2m1 0h1M2 18.5h5m3 0h5m1 0h1m4 0h1m2 0h1m1 0h3M1 19.5h1m1 0h1m1 0h3m4 0h2m2 0h2m5 0h2m2 0h1M8 20.5h3m5 0h7m4 0h1M2 21.5h1m1 0h1m1 0h3m2 0h4m1 0h12M9 22.5h1m1 0h1m2 0h2m4 0h2m3 0h5M1 23.5h7m1 0h2m1 0h3m3 0h4m1 0h1m1 0h2m1 0h1M1 24.5h1m5 0h1m1 0h1m6 0h2m3 0h1m3 0h2m1 0h2M1 25.5h1m1 0h3m1 0h1m3 0h2m2 0h5m1 0h5m1 0h2M1 26.5h1m1 0h3m1 0h1m1 0h9m2 0h3m2 0h2m2 0h1M1 27.5h1m1 0h3m1 0h1m1 0h1m2 0h2m1 0h1m2 0h2m2 0h1m1 0h1m2 0h1m1 0h1M1 28.5h1m5 0h1m3 0h2m3 0h1m4 0h2m1 0h1m1 0h1m1 0h1M1 29.5h7m1 0h2m1 0h1m1 0h2m1 0h1m1 0h3m4 0h1m1 0h1\"/></svg>\n",
  },
  {
    id: "edge",
    label: "Android · Edge",
    url: "https://www.tampermonkey.net/qr/e",
    help: "Edge + Tampermonkey",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 31 31\" shape-rendering=\"crispEdges\"><path fill=\"#ffffff\" d=\"M0 0h31v31H0z\"/><path stroke=\"#121212\" d=\"M1 1.5h7m2 0h1m3 0h3m1 0h2m3 0h7M1 2.5h1m5 0h1m1 0h2m5 0h1m4 0h1m1 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m1 0h1m2 0h1m2 0h1m1 0h1m2 0h1m2 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h3m3 0h2m1 0h1m1 0h2m1 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m2 0h1m3 0h3m1 0h1m1 0h2m1 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m2 0h2m1 0h3m1 0h1m1 0h1m3 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h6m5 0h2M1 9.5h1m5 0h1m1 0h1m1 0h2m2 0h2m1 0h3m1 0h2m2 0h3M1 10.5h4m1 0h1m1 0h5m2 0h1m2 0h3m1 0h1m1 0h2m1 0h2M2 11.5h1m1 0h4m1 0h1m1 0h1m1 0h1m4 0h1m2 0h1M2 12.5h3m1 0h1m2 0h2m1 0h1m2 0h3m1 0h3m2 0h1m1 0h1M2 13.5h1m3 0h3m2 0h5m1 0h1m3 0h1m1 0h2m4 0h1M1 14.5h1m2 0h1m1 0h1m2 0h1m1 0h2m1 0h2m2 0h4m1 0h1m1 0h1m2 0h2M1 15.5h1m3 0h1m1 0h2m1 0h1m1 0h7m2 0h2m1 0h1m1 0h2M1 16.5h2m1 0h2m2 0h2m1 0h1m2 0h2m3 0h1m2 0h4m1 0h1m1 0h1M4 17.5h1m1 0h3m4 0h1m1 0h2m1 0h1m1 0h1m3 0h1m1 0h2M1 18.5h1m1 0h1m1 0h1m2 0h3m1 0h2m2 0h2m1 0h3m1 0h3m1 0h3M1 19.5h3m1 0h1m1 0h1m1 0h2m1 0h5m1 0h1m1 0h2m4 0h1m2 0h1M1 20.5h1m2 0h3m1 0h3m4 0h3m2 0h1m1 0h1m1 0h2M1 21.5h1m2 0h2m1 0h1m2 0h3m5 0h1m2 0h5m1 0h3M9 22.5h2m1 0h3m1 0h2m2 0h2m3 0h2M1 23.5h7m2 0h1m3 0h3m3 0h2m1 0h1m1 0h3M1 24.5h1m5 0h1m2 0h1m2 0h2m1 0h1m2 0h3m3 0h1m2 0h1M1 25.5h1m1 0h3m1 0h1m3 0h1m1 0h2m1 0h1m2 0h8m1 0h2M1 26.5h1m1 0h3m1 0h1m2 0h1m2 0h1m2 0h5m1 0h1m1 0h1m1 0h2m1 0h1M1 27.5h1m1 0h3m1 0h1m2 0h1m1 0h3m1 0h3m1 0h1m2 0h6M1 28.5h1m5 0h1m2 0h1m3 0h1m2 0h1m5 0h2m1 0h2m1 0h1M1 29.5h7m1 0h1m1 0h3m1 0h4m1 0h1m1 0h1m1 0h4\"/></svg>\n",
  },
  {
    id: "firefox",
    label: "Android · Firefox",
    url: "https://www.tampermonkey.net/qr/f",
    help: "Firefox, then scan again for Tampermonkey",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 31 31\" shape-rendering=\"crispEdges\"><path fill=\"#ffffff\" d=\"M0 0h31v31H0z\"/><path stroke=\"#121212\" d=\"M1 1.5h7m2 0h7m1 0h2m3 0h7M1 2.5h1m5 0h1m1 0h1m1 0h1m4 0h1m4 0h1m1 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m1 0h3m1 0h1m1 0h1m1 0h1m2 0h1m2 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h4m2 0h2m1 0h1m1 0h2m1 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m3 0h1m2 0h3m1 0h1m1 0h2m1 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m2 0h1m1 0h1m1 0h2m1 0h1m1 0h1m3 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h1m2 0h3m5 0h2M1 9.5h1m5 0h1m1 0h2m4 0h2m1 0h3m1 0h2m2 0h3M1 10.5h1m3 0h1m2 0h2m1 0h2m2 0h1m2 0h3m1 0h1m1 0h2m1 0h2M1 11.5h8m3 0h1m5 0h1m2 0h1M2 12.5h1m3 0h1m5 0h1m2 0h3m1 0h3m2 0h1m1 0h1M1 13.5h1m2 0h2m1 0h4m3 0h2m1 0h1m3 0h1m1 0h2m4 0h1M3 14.5h1m2 0h1m1 0h2m2 0h4m2 0h4m1 0h1m1 0h1m2 0h2M2 15.5h2m1 0h4m5 0h3m1 0h1m2 0h2m1 0h1m1 0h2M5 16.5h2m2 0h2m2 0h4m2 0h1m2 0h4m1 0h1m1 0h1M2 17.5h2m3 0h3m1 0h3m1 0h2m1 0h1m1 0h1m3 0h1m1 0h2M1 18.5h1m1 0h1m1 0h2m9 0h2m1 0h3m1 0h3m1 0h3M1 19.5h11m1 0h4m1 0h1m1 0h2m4 0h1m2 0h1M1 20.5h1m1 0h1m2 0h1m2 0h2m1 0h1m2 0h3m2 0h1m1 0h1m1 0h2M1 21.5h1m5 0h2m2 0h1m6 0h1m2 0h5m1 0h3M9 22.5h1m1 0h1m2 0h1m1 0h2m2 0h2m3 0h2M1 23.5h7m2 0h1m1 0h1m1 0h3m3 0h2m1 0h1m1 0h3M1 24.5h1m5 0h1m2 0h1m1 0h1m1 0h1m1 0h1m2 0h3m3 0h1m2 0h1M1 25.5h1m1 0h3m1 0h1m2 0h1m3 0h1m1 0h1m2 0h8m1 0h2M1 26.5h1m1 0h3m1 0h1m3 0h1m2 0h1m1 0h5m1 0h1m1 0h1m1 0h2m1 0h1M1 27.5h1m1 0h3m1 0h1m2 0h2m1 0h1m2 0h3m1 0h1m2 0h6M1 28.5h1m5 0h1m4 0h2m1 0h1m1 0h1m5 0h2m1 0h2m1 0h1M1 29.5h7m1 0h1m6 0h3m1 0h1m1 0h1m1 0h4\"/></svg>\n",
  }
];
