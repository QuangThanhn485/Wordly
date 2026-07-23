export const MOBILE_APP_BAR_HEIGHT = 56;
export const MOBILE_BOTTOM_NAV_HEIGHT = 64;

export const MOBILE_BOTTOM_NAV_SPACER =
  `calc(${MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;

export const MOBILE_MAIN_VIEWPORT_HEIGHT =
  `calc(100dvh - ${MOBILE_APP_BAR_HEIGHT}px)`;

export const MOBILE_PAGE_VIEWPORT_HEIGHT =
  `calc(100dvh - ${MOBILE_APP_BAR_HEIGHT + MOBILE_BOTTOM_NAV_HEIGHT}px - env(safe-area-inset-bottom, 0px))`;
