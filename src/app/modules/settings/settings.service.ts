import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/appError";
import Settings from "./settings.model";
import {
    ISettings,
    IBrandSettings,
    IThemeSettings,
} from "./settings.interface";
import { SETTINGS_ID, SettingsSection } from "./settings.constant";
import { settingsCache } from "./settings.cache";
import {
    settingsPresets,
    DEFAULT_NICHE,
    defaultCurrency,
    defaultDeliveryOptions,
} from "./settings.presets";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";
import { mapSectionFiles } from "./settings.utils";
import { destroyCloudinaryUrls } from "../../config/cloudinary.config";

const getSettings = async (): Promise<ISettings> => {
    const cached = settingsCache.get();
    if (cached) return cached;

    const settings = await Settings.findById(SETTINGS_ID);

    if (!settings) {
        throw new AppError(
            StatusCodes.NOT_FOUND,
            "Settings not seeded. Run the settings seed script.",
        );
    }

    const data = settings.toObject();
    settingsCache.set(data as ISettings);

    return data as ISettings;
};

// Collect the image URLs of a settings section (old or new) so we can detect
// which ones were removed/replaced and destroy them from Cloudinary.
const sectionImageUrls = (
    section: SettingsSection,
    body: any,
): string[] => {
    const urls: string[] = [];
    if (!body) return urls;

    const push = (u: unknown) => {
        if (typeof u === "string" && u) urls.push(u);
    };

    if (section === "hero") {
        (body.slides || []).forEach((s: any) => push(s?.image));
    } else if (section === "testimonials") {
        (body.items || []).forEach((i: any) => push(i?.avatar));
    } else if (section === "about" || section === "limitedOffer") {
        push(body.image);
    }
    return urls;
};

const updateSection = async <K extends SettingsSection>(
    section: K,
    data: Partial<ISettings[K]>,
    files?: Express.Multer.File[],
) => {
    const body = mapSectionFiles(section, data, files);

    // Old image URLs for the image-bearing sections — anything in the previous
    // section body that is NOT in the new body is considered replaced/removed.
    const oldSection = await Settings.findById(SETTINGS_ID).select(section);
    const previousImages = sectionImageUrls(
        section,
        (oldSection as any)?.[section],
    );
    const newImages = new Set(sectionImageUrls(section, body));

    const updated = await Settings.findByIdAndUpdate(
        SETTINGS_ID,
        { $set: { [section]: body } },
        { new: true, runValidators: true },
    );

    if (!updated) {
        throw new AppError(
            StatusCodes.NOT_FOUND,
            "Settings not seeded. Run the settings seed script.",
        );
    }

    settingsCache.invalidate();

    // DB write succeeded — destroy removed/replaced images from Cloudinary.
    const removedUrls = previousImages.filter((u) => !newImages.has(u));
    if (removedUrls.length) {
        await destroyCloudinaryUrls(removedUrls);
    }

    await ActivityServices.logActivity({
        module: ActivityModule.SETTINGS,
        type: ActivityType.UPDATE,
        message: `Settings section "${section}" was updated`,
        metadata: { section },
    });

    return updated.toObject();
};

const updateBrandFields = async (
    payload: Partial<ISettings["brand"]>,
    files?: { logo?: Express.Multer.File[]; favicon?: Express.Multer.File[] },
) => {
    // Build a $set with dotted paths — ONLY for fields actually provided.
    // This preserves any field the client didn't send (e.g. logo/favicon stay
    // unchanged instead of being reset to "" by a full brand sub-doc replace).
    const set: Record<string, unknown> = {};

    if (payload && typeof payload === "object") {
        for (const [key, value] of Object.entries(payload)) {
            if (value !== undefined) {
                set[`brand.${key}`] = value;
            }
        }
    }

    // Uploaded files override the corresponding text fields.
    if (files?.logo?.length) {
        set["brand.logo"] = files.logo[0].path;
    }

    if (files?.favicon?.length) {
        set["brand.favicon"] = files.favicon[0].path;
    }

    // Nothing to update → 400 instead of a pointless write.
    if (Object.keys(set).length === 0) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "No brand fields provided to update!",
        );
    }

    // Grab the CURRENT logo/favicon so a replacement can destroy the old files
    // from Cloudinary AFTER the DB write succeeds.
    const existingBrand = await Settings.findById(SETTINGS_ID).select("brand");
    const previousLogo = existingBrand?.brand?.logo as string | undefined;
    const previousFavicon = existingBrand?.brand?.favicon as string | undefined;

    const updated = await Settings.findByIdAndUpdate(
        SETTINGS_ID,
        { $set: set },
        { new: true, runValidators: true },
    );

    if (!updated) {
        throw new AppError(
            StatusCodes.NOT_FOUND,
            "Settings not seeded. Run the settings seed script.",
        );
    }

    settingsCache.invalidate();

    // Destroy replaced logo/favicon from Cloudinary (best-effort).
    const oldUrls: string[] = [];
    if (files?.logo?.length && previousLogo && previousLogo !== updated.brand.logo) {
        oldUrls.push(previousLogo);
    }
    if (files?.favicon?.length && previousFavicon && previousFavicon !== updated.brand.favicon) {
        oldUrls.push(previousFavicon);
    }
    if (oldUrls.length) {
        await destroyCloudinaryUrls(oldUrls);
    }

    await ActivityServices.logActivity({
        module: ActivityModule.SETTINGS,
        type: ActivityType.UPDATE,
        message: "Brand settings were updated",
        metadata: { fields: Object.keys(set) },
    });

    return updated.toObject();
};

// Applies ONLY the niche theme (colors, fonts, radius, globalCss).
// The rest of the settings doc (brand, hero, navbar, footer, ...) is untouched.
const applyNichePreset = async (niche: string) => {
    const preset = settingsPresets[niche];

    if (!preset) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            `No settings preset found for niche "${niche}".`,
        );
    }

    const updated = await Settings.findByIdAndUpdate(
        SETTINGS_ID,
        { $set: { theme: preset.theme } },
        { new: true, runValidators: true },
    );

    if (!updated) {
        throw new AppError(
            StatusCodes.NOT_FOUND,
            "Settings not seeded. Run the settings seed script.",
        );
    }

    settingsCache.invalidate();

    await ActivityServices.logActivity({
        module: ActivityModule.SETTINGS,
        type: ActivityType.PRESET,
        message: `"${niche}" niche theme was applied`,
        metadata: { niche, scope: "theme" },
    });

    return updated.toObject();
};

// Full reset — applies the WHOLE niche preset (theme + brand + hero + about +
// contact + footer + navbar + testimonials + limitedOffer). Brand currency and
// delivery options are PRESERVED if already set (the admin may have customized
// them); otherwise they fall back to the preset defaults ("usd" + default list).
//
// Special niche "empty": clears ALL sections to empty defaults so the admin can
// fill everything in one by one. Currency + delivery options are preserved; the
// brand keeps a minimal identity (name/niche/nicheLabel) so the store remains
// usable while being rebuilt.
const emptyPresetDefaults = () => ({
    brand: {
        name: "",
        tagline: "",
        description: "",
        niche: "",
        nicheLabel: "",
        logo: "",
        favicon: "",
        currency: defaultCurrency,
        deliveryOptions: defaultDeliveryOptions,
    } as IBrandSettings,
    theme: {
        colors: {
            background: "",
            foreground: "",
            card: "",
            cardForeground: "",
            popover: "",
            popoverForeground: "",
            primary: "",
            primaryForeground: "",
            secondary: "",
            secondaryForeground: "",
            muted: "",
            mutedForeground: "",
            accent: "",
            accentForeground: "",
            destructive: "",
            border: "",
            input: "",
            ring: "",
            chart1: "",
            chart2: "",
            chart3: "",
            chart4: "",
            chart5: "",
            sidebar: "",
            sidebarForeground: "",
            sidebarPrimary: "",
            sidebarPrimaryForeground: "",
            sidebarAccent: "",
            sidebarAccentForeground: "",
            sidebarBorder: "",
            sidebarRing: "",
        },
        dark: { enabled: false, colors: {} },
        fonts: {
            family: "",
            mono: "",
            sizes: { h1: "", h2: "", h3: "", body: "", small: "" },
        },
        radius: "",
        globalCss: "",
    } as IThemeSettings,
    hero: { slides: [] },
    testimonials: { heading: "", items: [] },
    navbar: {
        links: [],
        groups: { auth: [], customer: [], admin: [] },
    },
    footer: {
        description: "",
        columns: [],
        socialLinks: [],
        copyrightText: "",
        newsletter: { enabled: false, heading: "" },
    },
    contact: {
        address: "",
        phone: "",
        email: "",
        hours: "",
        mapEmbedUrl: "",
        social: { twitter: "", instagram: "", facebook: "" },
    },
    about: { story: "", mission: "", image: "", stats: [] },
    limitedOffer: {
        enabled: false,
        badge: "",
        title: "",
        subtitle: "",
        ctaText: "",
        ctaLink: "",
        image: "",
        endsAt: "",
    },
});

const applyFullReset = async (niche: string) => {
    const existing = await Settings.findById(SETTINGS_ID);

    // Preserve customized currency + delivery options when present.
    const preserveExisting = () => ({
        currency: existing?.brand?.currency || defaultCurrency,
        deliveryOptions:
            existing?.brand?.deliveryOptions?.length
                ? existing.brand.deliveryOptions
                : defaultDeliveryOptions,
    });

    let resetPayload: Record<string, unknown>;

    if (niche === "empty") {
        // Clear everything, keeping currency + delivery options + a minimal brand
        // identity (name/niche/nicheLabel survive so the store isn't broken).
        const empty = emptyPresetDefaults();
        resetPayload = {
            ...empty,
            brand: {
                ...empty.brand,
                name: existing?.brand?.name || "",
                niche: existing?.brand?.niche || "",
                nicheLabel: existing?.brand?.nicheLabel || "",
                ...preserveExisting(),
            },
        };
    } else {
        const preset = settingsPresets[niche];
        if (!preset) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `No settings preset found for niche "${niche}".`,
            );
        }
        resetPayload = {
            brand: {
                ...preset.brand,
                ...preserveExisting(),
            },
            theme: preset.theme,
            hero: preset.hero,
            about: preset.about,
            contact: preset.contact,
            footer: preset.footer,
            navbar: preset.navbar,
            testimonials: preset.testimonials,
            limitedOffer: preset.limitedOffer,
        };
    }

    const updated = await Settings.findByIdAndUpdate(
        SETTINGS_ID,
        { $set: resetPayload },
        { new: true, runValidators: true },
    );

    if (!updated) {
        throw new AppError(
            StatusCodes.NOT_FOUND,
            "Settings not seeded. Run the settings seed script.",
        );
    }

    settingsCache.invalidate();

    // DB write succeeded — destroy old section images that the reset replaced
    // (hero slides, testimonial avatars, about/limitedOffer images).
    const previousImages = [
        ...sectionImageUrls("hero", (existing as any)?.hero),
        ...sectionImageUrls("testimonials", (existing as any)?.testimonials),
        ...sectionImageUrls("about", (existing as any)?.about),
        ...sectionImageUrls("limitedOffer", (existing as any)?.limitedOffer),
    ];
    const newImages = new Set([
        ...sectionImageUrls("hero", resetPayload.hero),
        ...sectionImageUrls("testimonials", resetPayload.testimonials),
        ...sectionImageUrls("about", resetPayload.about),
        ...sectionImageUrls("limitedOffer", resetPayload.limitedOffer),
    ]);
    const removedImages = previousImages.filter((u) => !newImages.has(u));
    if (removedImages.length) {
        await destroyCloudinaryUrls(removedImages);
    }

    await ActivityServices.logActivity({
        module: ActivityModule.SETTINGS,
        type: ActivityType.PRESET,
        message:
            niche === "empty"
                ? "Settings were reset to empty defaults"
                : `Settings were fully reset to the "${niche}" niche preset`,
        metadata: { niche, scope: niche === "empty" ? "empty" : "full-reset" },
    });

    return updated.toObject();
};

const applyDefaultPreset = async () => applyNichePreset(DEFAULT_NICHE);

export const SettingsServices = {
    getSettings,
    updateSection,
    updateBrandFields,
    applyNichePreset,
    applyFullReset,
    applyDefaultPreset,
};
