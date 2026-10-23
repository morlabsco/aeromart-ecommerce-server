import { Server } from "http";
import mongoose from "mongoose";
import config from "./app/config";
import app from "./app";
import dns from 'dns';

let server: Server | null = null;

dns.setServers(['8.8.8.8', '8.8.4.4']);

// Database Connection
async function connectToDatabase() {
    try {
        await mongoose.connect(config.db_url as string);
        console.log("💧 Database connected successfully");
    } catch (error) {
        console.error("Failed to connect to database", error);
        process.exit(1);
    }
}

// The old `variants.sku_1` index was unique but NOT sparse, so empty `variants`
// arrays produced a `variants.sku: null` entry — the second product created
// without variants hit a duplicate-key error. Drop it; the model now declares
// a sparse unique index and Mongoose rebuilds it on next syncIndexes/init.
async function migrateProductIndexes() {
    try {
        await mongoose.connection
            .collection("products")
            .dropIndex("variants.sku_1")
            .catch(() => {});
        console.log("🔧 Dropped legacy non-sparse 'variants.sku_1' index");
    } catch (error) {
        console.error("Failed to migrate product indexes", error);
    }
}

// Graceful shutdown
function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}. Closing server...`);
    if (server) {
        server.close(() => {
            console.log("Server closed gracefully");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
}

async function bootstrap() {
    try {
        await connectToDatabase();
        await migrateProductIndexes();

        server = app.listen(config.port, () => {
            console.log(`🔥 Application is running on port ${config.port}`);
        });

        // Listen for termination signals
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Error handling
        process.on("uncaughtException", (error) => {
            console.error("Uncaught Exception:", error);
            gracefulShutdown("uncaughtException");
        });

        process.on("unhandledRejection", (error) => {
            console.error("Unhandled Rejection:", error);
            gracefulShutdown("unhandledRejection");
        });
    } catch (error) {
        console.error("Error during bootstrap:", error);
        process.exit(1);
    }
}

// Start the application
bootstrap();