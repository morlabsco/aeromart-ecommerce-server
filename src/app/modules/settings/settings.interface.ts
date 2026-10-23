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
    createdAt: Date;
    updatedAt: Date;
}

export interface SettingsModel extends Model<ISettings> {}
