import { SettingsSection } from "./settings.constant";

// Maps uploaded files into the section body by position (same semantics as
// the product module: re-send the whole section, image fields come from files).
export const mapSectionFiles = <T extends Record<string, unknown>>(
    section: SettingsSection,
    body: T,
    files?: Express.Multer.File[],
): T => {
    if (!files?.length) return body;

    if (section === "hero") {
        const slides = (body as any).slides as any[] | undefined;
        if (slides) {
            slides.forEach((slide, i) => {
                if (files[i]) slide.image = files[i].path;
            });
        }
    } else if (section === "testimonials") {
        const items = (body as any).items as any[] | undefined;
        if (items) {
            items.forEach((item, i) => {
                if (files[i]) item.avatar = files[i].path;
            });
        }
    } else if (section === "about") {
        (body as any).image = files[0]?.path ?? (body as any).image;
    } else if (section === "limitedOffer") {
        (body as any).image = files[0]?.path ?? (body as any).image;
    }

    return body;
};
