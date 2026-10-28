// One-off maintenance script (28/10/2026): the seeded theme carried
// fonts.family "Playfair Display", which the ThemeProvider injects over the
// app's Jost + Hind Siliguri stack. This sets the family to "Jost" — the
// provider maps it back to the next/font variables with the Bangla fallback.
// Surgical $set of one field — safe to re-run, touches nothing else.
import mongoose from "mongoose";
import Settings from "../app/modules/settings/settings.model";
import { SETTINGS_ID } from "../app/modules/settings/settings.constant";
import config from "../app/config";
import dns from "dns";

const fix = async () => {
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
        await mongoose.connect(config.db_url as string);

        const res = await Settings.updateOne(
            { _id: SETTINGS_ID },
            { $set: { "theme.fonts.family": "Jost" } },
        );
        console.log(
            `theme font fix — matched=${res.matchedCount} modified=${res.modifiedCount}`,
        );
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fix();
