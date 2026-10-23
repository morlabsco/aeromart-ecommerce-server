import mongoose from "mongoose";
import Settings from "../app/modules/settings/settings.model";
import { SETTINGS_ID } from "../app/modules/settings/settings.constant";
import { settingsPresets, DEFAULT_NICHE } from "../app/modules/settings/settings.presets";
import config from "../app/config";
import dns from "dns";

const seed = async () => {
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
        await mongoose.connect(config.db_url as string);

        const exists = await Settings.findById(SETTINGS_ID);

        if (!exists) {
            await Settings.create({
                _id: SETTINGS_ID,
                ...settingsPresets[DEFAULT_NICHE],
            });
            console.log(
                `Settings singleton seeded with "${DEFAULT_NICHE}" preset.`,
            );
        } else {
            console.log("Settings singleton already exists, skipping.");
        }
    } catch (error) {
        console.error("Failed to seed settings:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

seed();
