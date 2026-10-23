import mongoose, { Schema } from "mongoose";
import { ISettings, SettingsModel } from "./settings.interface";
import { SETTINGS_ID } from "./settings.constant";
import { Currency } from "../../constants/currency";

const themeColorsSchema = new Schema(
    {
        background: { type: String, default: "" },
        foreground: { type: String, default: "" },
        card: { type: String, default: "" },
        cardForeground: { type: String, default: "" },
        popover: { type: String, default: "" },
        popoverForeground: { type: String, default: "" },
        primary: { type: String, default: "" },
        primaryForeground: { type: String, default: "" },
        secondary: { type: String, default: "" },
        secondaryForeground: { type: String, default: "" },
        muted: { type: String, default: "" },
        mutedForeground: { type: String, default: "" },
        accent: { type: String, default: "" },
        accentForeground: { type: String, default: "" },
        destructive: { type: String, default: "" },
        border: { type: String, default: "" },
        input: { type: String, default: "" },
        ring: { type: String, default: "" },
        chart1: { type: String, default: "" },
        chart2: { type: String, default: "" },
        chart3: { type: String, default: "" },
        chart4: { type: String, default: "" },
        chart5: { type: String, default: "" },
        sidebar: { type: String, default: "" },
        sidebarForeground: { type: String, default: "" },
        sidebarPrimary: { type: String, default: "" },
        sidebarPrimaryForeground: { type: String, default: "" },
        sidebarAccent: { type: String, default: "" },
        sidebarAccentForeground: { type: String, default: "" },
        sidebarBorder: { type: String, default: "" },
        sidebarRing: { type: String, default: "" },
    },
    { _id: false },
);

const themeSchema = new Schema(
    {
        colors: { type: themeColorsSchema, default: () => ({}) },
        dark: {
            enabled: { type: Boolean, default: false },
            colors: { type: themeColorsSchema, default: () => ({}) },
        },
        fonts: {
            family: { type: String, default: "" },
            mono: { type: String, default: "" },
            sizes: {
                h1: { type: String, default: "" },
                h2: { type: String, default: "" },
                h3: { type: String, default: "" },
                body: { type: String, default: "" },
                small: { type: String, default: "" },
            },
        },
        radius: { type: String, default: "" },
        globalCss: { type: String, default: "" },
    },
    { _id: false },
);

const brandSchema = new Schema(
    {
        name: { type: String, default: "" },
        tagline: { type: String, default: "" },
        description: { type: String, default: "" },
        niche: { type: String, default: "" },
        nicheLabel: { type: String, default: "" },
        logo: { type: String, default: "" },
        favicon: { type: String, default: "" },
        currency: {
            type: String,
            enum: Object.values(Currency),
            default: Currency.USD,
        },
        deliveryOptions: {
            type: [
                new Schema(
                    {
                        name: { type: String, default: "" },
                        charge: { type: Number, default: 0, min: 0 },
                        country: { type: String, default: "" },
                        isActive: { type: Boolean, default: true },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
    },
    { _id: false },
);

const heroSlideSchema = new Schema(
    {
        image: { type: String, default: "" },
        headline: { type: String, default: "" },
        subtext: { type: String, default: "" },
        ctaText: { type: String, default: "" },
        ctaLink: { type: String, default: "" },
        order: { type: Number, default: 0 },
    },
    { _id: false },
);

const heroSchema = new Schema(
    {
        slides: { type: [heroSlideSchema], default: [] },
    },
    { _id: false },
);

const testimonialItemSchema = new Schema(
    {
        name: { type: String, default: "" },
        role: { type: String, default: "" },
        quote: { type: String, default: "" },
        rating: { type: Number, default: 5 },
        avatar: { type: String, default: "" },
        order: { type: Number, default: 0 },
    },
    { _id: false },
);

const testimonialsSchema = new Schema(
    {
        heading: { type: String, default: "" },
        items: { type: [testimonialItemSchema], default: [] },
    },
    { _id: false },
);

const footerLinkSchema = new Schema(
    {
        label: { type: String, default: "" },
        url: { type: String, default: "" },
    },
    { _id: false },
);

const footerColumnSchema = new Schema(
    {
        title: { type: String, default: "" },
        links: { type: [footerLinkSchema], default: [] },
    },
    { _id: false },
);

const footerSchema = new Schema(
    {
        description: { type: String, default: "" },
        columns: { type: [footerColumnSchema], default: [] },
        socialLinks: {
            type: [
                new Schema(
                    {
                        platform: { type: String, default: "" },
                        url: { type: String, default: "" },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        copyrightText: { type: String, default: "" },
        newsletter: {
            enabled: { type: Boolean, default: false },
            heading: { type: String, default: "" },
        },
    },
    { _id: false },
);

const navLinkSchema = new Schema(
    {
        label: { type: String, default: "" },
        url: { type: String, default: "" },
        order: { type: Number, default: 0 },
        children: {
            type: [
                new Schema(
                    {
                        label: { type: String, default: "" },
                        url: { type: String, default: "" },
                        order: { type: Number, default: 0 },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
    },
    { _id: false },
);

const navGroupSchema = new Schema(
    {
        auth: { type: [navLinkSchema], default: [] },
        customer: { type: [navLinkSchema], default: [] },
        admin: { type: [navLinkSchema], default: [] },
    },
    { _id: false },
);

const navbarSchema = new Schema(
    {
        links: { type: [navLinkSchema], default: [] },
        groups: { type: navGroupSchema, default: () => ({}) },
    },
    { _id: false },
);

const contactSchema = new Schema(
    {
        address: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        hours: { type: String, default: "" },
        mapEmbedUrl: { type: String, default: "" },
        social: {
            twitter: { type: String, default: "" },
            instagram: { type: String, default: "" },
            facebook: { type: String, default: "" },
        },
    },
    { _id: false },
);

const aboutSchema = new Schema(
    {
        story: { type: String, default: "" },
        mission: { type: String, default: "" },
        image: { type: String, default: "" },
        stats: {
            type: [
                new Schema(
                    {
                        label: { type: String, default: "" },
                        value: { type: String, default: "" },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
    },
    { _id: false },
);

const limitedOfferSchema = new Schema(
    {
        enabled: { type: Boolean, default: false },
        badge: { type: String, default: "" },
        title: { type: String, default: "" },
        subtitle: { type: String, default: "" },
        ctaText: { type: String, default: "" },
        ctaLink: { type: String, default: "" },
        image: { type: String, default: "" },
        endsAt: { type: String, default: "" },
    },
    { _id: false },
);

const settingsSchema = new Schema<ISettings, SettingsModel>(
    {
        _id: {
            type: String,
            default: SETTINGS_ID,
        } as any,
        brand: { type: brandSchema, default: () => ({}) },
        theme: { type: themeSchema, default: () => ({}) },
        hero: { type: heroSchema, default: () => ({}) },
        testimonials: { type: testimonialsSchema, default: () => ({}) },
        navbar: { type: navbarSchema, default: () => ({}) },
        footer: { type: footerSchema, default: () => ({}) },
        contact: { type: contactSchema, default: () => ({}) },
        about: { type: aboutSchema, default: () => ({}) },
        limitedOffer: { type: limitedOfferSchema, default: () => ({}) },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
        toJSON: {
            transform: (_doc, ret) => {
                const { __v, ...rest } = ret;
                return rest;
            },
        },
    },
);

const Settings = mongoose.model<ISettings, SettingsModel>(
    "Settings",
    settingsSchema,
);

export default Settings;
