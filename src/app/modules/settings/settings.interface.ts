import { Document, Model } from "mongoose";

// ------------------------------------------------------------
// Theme
// ------------------------------------------------------------
// All CSS custom properties exposed by global.css — both the base set and the
// shadcn/ui sidebar + chart additions. The user only sends the fields they
// want to change; everything else keeps its current value.
export interface IThemeColors {
    // Base shadcn/ui tokens
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
    // Chart tokens
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
    // Sidebar tokens
    sidebar: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
    sidebarRing: string;
}

export interface IThemeFonts {
    family: string;
    mono: string;
    sizes: {
        h1: string;
        h2: string;
        h3: string;
        body: string;
        small: string;
    };
}

export interface IThemeSettings {
    colors: IThemeColors;
    dark: {
        enabled: boolean;
        colors: Partial<IThemeColors>;
    };
    fonts: IThemeFonts;
    radius: string;
    globalCss: string;
}

// ------------------------------------------------------------
// Brand / Niche
// ------------------------------------------------------------
export interface IDeliveryOption {
    name: string;
    charge: number;
    country?: string;
    isActive: boolean;
}

export interface IBrandSettings {
    name: string;
    tagline: string;
    description: string;
    niche: string;
    nicheLabel: string;
    logo: string;
    favicon: string;
    // When true the storefront shows only the logo (natural aspect, uncropped)
    // instead of logo + name text.
    logoOnly: boolean;
    // The store's active currency (e.g. "usd", "bdt") — products/orders
    // inherit it, changeable via admin.
    currency: string;
    // Delivery options the storefront offers; order creation resolves the
    // charge from the selected option's name.
    deliveryOptions: IDeliveryOption[];
}

// ------------------------------------------------------------
// Hero
// ------------------------------------------------------------
export interface IHeroSlide {
    image: string;
    headline: string;
    subtext: string;
    ctaText: string;
    ctaLink: string;
    order: number;
}

export interface IHeroSection {
    slides: IHeroSlide[];
}

// ------------------------------------------------------------
// Testimonials
// ------------------------------------------------------------
export interface ITestimonialItem {
    name: string;
    role: string;
    quote: string;
    rating: number;
    avatar: string;
    order: number;
}

export interface ITestimonialSection {
    heading: string;
    items: ITestimonialItem[];
}

// ------------------------------------------------------------
// Footer
// ------------------------------------------------------------
export interface IFooterLink {
    label: string;
    url: string;
}

export interface IFooterColumn {
    title: string;
    links: IFooterLink[];
}

export interface IFooterSection {
    description: string;
    columns: IFooterColumn[];
    socialLinks: { platform: string; url: string }[];
    copyrightText: string;
    newsletter: {
        enabled: boolean;
        heading: string;
    };
}

// ------------------------------------------------------------
// Navbar
// ------------------------------------------------------------
export interface INavLink {
    label: string;
    url: string;
    order: number;
    children: INavLink[];
}

export interface INavbarSection {
    links: INavLink[];
    groups: {
        auth: INavLink[];
        customer: INavLink[];
        admin: INavLink[];
    };
}

// ------------------------------------------------------------
// Contact
// ------------------------------------------------------------
export interface IContactSection {
    address: string;
    phone: string;
    email: string;
    hours: string;
    mapEmbedUrl: string;
    social: {
        twitter: string;
        instagram: string;
        facebook: string;
    };
}

// ------------------------------------------------------------
// About
// ------------------------------------------------------------
export interface IAboutSection {
    story: string;
    mission: string;
    image: string;
    stats: { label: string; value: string }[];
}

// ------------------------------------------------------------
// Limited Offer
// ------------------------------------------------------------
export interface ILimitedOfferSection {
    enabled: boolean;
    badge: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    image: string;
    endsAt: string;
}

// ------------------------------------------------------------
// SEO
// ------------------------------------------------------------
// Store-wide search/social metadata. Every field falls back gracefully:
// empty title → brand name; empty ogImage → first hero slide → brand logo.
export interface ISeoSection {
    // Home page <title> (falls back to the brand name — never "Brand - X").
    title: string;
    // How sub-page titles compose, Next.js pattern with %s, e.g. "%s | Attor".
    titleTemplate: string;
    // Meta description (search snippet copy).
    description: string;
    // Comma-separated meta keywords.
    keywords: string;
    // Social share image (Open Graph / Twitter), recommended 1200x630.
    // Empty = auto (first hero slide image, else the brand logo).
    ogImage: string;
    // When true the storefront sends noindex, nofollow robots meta.
    noindex: boolean;
}

// ------------------------------------------------------------
// Policy
// ------------------------------------------------------------
// Editable storefront policy pages. `returnRefund` holds rich HTML produced
// by the dashboard editor; an EMPTY string means "render the built-in
// default page" (the typed builder in the app), so the shipped design is
// never lost — it is only overridden while the admin has custom content.
export interface IPolicySection {
    returnRefund: string;
}

// ------------------------------------------------------------
// Settings singleton
// ------------------------------------------------------------
export interface ISettings extends Document {
    brand: IBrandSettings;
    theme: IThemeSettings;
    hero: IHeroSection;
    testimonials: ITestimonialSection;
    navbar: INavbarSection;
    footer: IFooterSection;
    contact: IContactSection;
    about: IAboutSection;
    limitedOffer: ILimitedOfferSection;
    seo: ISeoSection;
    policy: IPolicySection;
    createdAt: Date;
    updatedAt: Date;
}

export interface SettingsModel extends Model<ISettings> {}
