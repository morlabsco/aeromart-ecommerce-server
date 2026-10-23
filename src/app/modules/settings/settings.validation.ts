import { z } from "zod";
import { SETTINGS_SECTIONS, SettingsSection } from "./settings.constant";
import { Currency } from "../../constants/currency";

const themeColorsValidationSchema = z.object({
    background: z.string().optional(),
    foreground: z.string().optional(),
    card: z.string().optional(),
    cardForeground: z.string().optional(),
    popover: z.string().optional(),
    popoverForeground: z.string().optional(),
    primary: z.string().optional(),
    primaryForeground: z.string().optional(),
    secondary: z.string().optional(),
    secondaryForeground: z.string().optional(),
    muted: z.string().optional(),
    mutedForeground: z.string().optional(),
    accent: z.string().optional(),
    accentForeground: z.string().optional(),
    destructive: z.string().optional(),
    border: z.string().optional(),
    input: z.string().optional(),
    ring: z.string().optional(),
    chart1: z.string().optional(),
    chart2: z.string().optional(),
    chart3: z.string().optional(),
    chart4: z.string().optional(),
    chart5: z.string().optional(),
    sidebar: z.string().optional(),
    sidebarForeground: z.string().optional(),
    sidebarPrimary: z.string().optional(),
    sidebarPrimaryForeground: z.string().optional(),
    sidebarAccent: z.string().optional(),
    sidebarAccentForeground: z.string().optional(),
    sidebarBorder: z.string().optional(),
    sidebarRing: z.string().optional(),
});

const themeValidationSchema = z.object({
    colors: themeColorsValidationSchema.optional(),
    dark: z
        .object({
            enabled: z.boolean().optional(),
            colors: themeColorsValidationSchema.optional(),
        })
        .optional(),
    fonts: z
        .object({
            family: z.string().optional(),
            mono: z.string().optional(),
            sizes: z
                .object({
                    h1: z.string().optional(),
                    h2: z.string().optional(),
                    h3: z.string().optional(),
                    body: z.string().optional(),
                    small: z.string().optional(),
                })
                .optional(),
        })
        .optional(),
    radius: z.string().optional(),
    globalCss: z.string().optional(),
});

const brandValidationSchema = z.object({
    name: z.string().min(1, "Brand name is required").optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    niche: z.string().optional(),
    nicheLabel: z.string().optional(),
    logo: z.string().optional(),
    favicon: z.string().optional(),
    currency: z
        .nativeEnum(Currency, {
            errorMap: () => ({ message: "Invalid currency code" }),
        })
        .optional(),
    deliveryOptions: z
        .array(
            z.object({
                name: z.string().min(1, "Delivery option name is required"),
                charge: z.number().min(0, "Charge cannot be negative"),
                country: z.string().optional(),
                isActive: z.boolean().optional(),
            }),
        )
        .optional(),
});

const heroSlideValidationSchema = z.object({
    image: z.string().optional(),
    headline: z.string().min(1, "Headline is required"),
    subtext: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    order: z.number().min(0).optional(),
});

const heroValidationSchema = z.object({
    slides: z.array(heroSlideValidationSchema).default([]),
});

const testimonialItemValidationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().optional(),
    quote: z.string().min(1, "Quote is required"),
    rating: z.number().min(1).max(5).default(5),
    avatar: z.string().optional(),
    order: z.number().min(0).optional(),
});

const testimonialsValidationSchema = z.object({
    heading: z.string().optional(),
    items: z.array(testimonialItemValidationSchema).default([]),
});

const footerLinkValidationSchema = z.object({
    label: z.string().min(1, "Link label is required"),
    url: z.string().min(1, "Link URL is required"),
});

const footerColumnValidationSchema = z.object({
    title: z.string().min(1, "Column title is required"),
    links: z.array(footerLinkValidationSchema).default([]),
});

const footerValidationSchema = z.object({
    description: z.string().optional(),
    columns: z.array(footerColumnValidationSchema).default([]),
    socialLinks: z
        .array(
            z.object({
                platform: z.string().min(1, "Platform is required"),
                url: z.string().min(1, "URL is required"),
            }),
        )
        .optional(),
    copyrightText: z.string().optional(),
    newsletter: z
        .object({
            enabled: z.boolean().optional(),
            heading: z.string().optional(),
        })
        .optional(),
});

const navLinkValidationSchema: z.ZodTypeAny = z.object({
    label: z.string().min(1, "Link label is required"),
    url: z.string().min(1, "Link URL is required"),
    order: z.number().min(0).optional(),
    children: z.array(z.lazy(() => navLinkValidationSchema)).default([]),
});

const navbarValidationSchema = z.object({
    links: z.array(navLinkValidationSchema).default([]),
    groups: z
        .object({
            auth: z.array(navLinkValidationSchema).default([]),
            customer: z.array(navLinkValidationSchema).default([]),
            admin: z.array(navLinkValidationSchema).default([]),
        })
        .optional(),
});

const contactValidationSchema = z.object({
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional(),
    hours: z.string().optional(),
    mapEmbedUrl: z.string().optional(),
    social: z
        .object({
            twitter: z.string().optional(),
            instagram: z.string().optional(),
            facebook: z.string().optional(),
        })
        .optional(),
});

const aboutValidationSchema = z.object({
    story: z.string().optional(),
    mission: z.string().optional(),
    image: z.string().optional(),
    stats: z
        .array(
            z.object({
                label: z.string().min(1, "Stat label is required"),
                value: z.string().min(1, "Stat value is required"),
            }),
        )
        .default([]),
});

const limitedOfferValidationSchema = z.object({
    enabled: z.boolean().optional(),
    badge: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    image: z.string().optional(),
    endsAt: z.string().optional(),
});

export const sectionBodySchemas: Record<SettingsSection, z.ZodTypeAny> = {
    theme: themeValidationSchema,
    hero: heroValidationSchema,
    testimonials: testimonialsValidationSchema,
    navbar: navbarValidationSchema,
    footer: footerValidationSchema,
    contact: contactValidationSchema,
    about: aboutValidationSchema,
    limitedOffer: limitedOfferValidationSchema,
};

export const updateBrandFieldsValidationSchema = z.object({
    body: z.object({
        brand: brandValidationSchema.optional(),
    }),
});

export const SettingsValidation = {
    sectionBodySchemas,
    updateBrandFieldsValidationSchema,
    SETTINGS_SECTIONS,
};
