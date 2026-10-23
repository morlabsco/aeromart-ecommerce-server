export const generateSlug = (name: string): string => {
    const baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Append a short random suffix so the slug stays unique
    const randomSuffix = Math.random().toString(36).slice(2, 8);

    return `${baseSlug}-${randomSuffix}`;
};
