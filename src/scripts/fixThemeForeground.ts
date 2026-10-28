// One-off maintenance script (28/10/2026): the theme editor's old
// contrast-race derivation wrote a near-black `primaryForeground` for the
// current blue (light) / orange (dark) primaries, so primary buttons,
// checkboxes and chips rendered black text on the brand color. This sets a
// near-white foreground on both themes' primary + sidebar primary pairs.
// Surgical $set of exactly four fields — safe to re-run, touches nothing else.
import mongoose from "mongoose";
import Settings from "../app/modules/settings/settings.model";
import { SETTINGS_ID } from "../app/modules/settings/settings.constant";
import config from "../app/config";
import dns from "dns";

const ON_COLOR_FOREGROUND = "oklch(0.985 0 0)";

const fix = async () => {
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
        await mongoose.connect(config.db_url as string);

        const res = await Settings.updateOne(
            { _id: SETTINGS_ID },
            {
                $set: {
                    "theme.colors.primaryForeground": ON_COLOR_FOREGROUND,
                    "theme.colors.sidebarPrimaryForeground": ON_COLOR_FOREGROUND,
                    "theme.dark.colors.primaryForeground": ON_COLOR_FOREGROUND,
                    "theme.dark.colors.sidebarPrimaryForeground": ON_COLOR_FOREGROUND,
                },
            },
        );
        console.log(
            `theme foreground fix — matched=${res.matchedCount} modified=${res.modifiedCount}`,
        );
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fix();
