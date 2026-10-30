export const SETTINGS_ID = "singleton";

export const SETTINGS_SECTIONS = [
    "theme",
    "hero",
    "testimonials",
    "navbar",
    "footer",
    "contact",
    "about",
    "limitedOffer",
    "seo",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
