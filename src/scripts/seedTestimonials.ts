// One-off content seed (28/10/2026): replaces the settings testimonials with
// 10 Bangla customer reviews (massage-type products, real BD names and
// cities, plain human tone). Avatars are left EMPTY on purpose — the store
// owner will upload Bangladesh-region photos later (empty avatars render the
// initials fallback on the storefront). Safe to re-run.
import mongoose from "mongoose";
import Settings from "../app/modules/settings/settings.model";
import { SETTINGS_ID } from "../app/modules/settings/settings.constant";
import config from "../app/config";
import dns from "dns";

const testimonials = [
    {
        name: "মোহাম্মদ রফিকুল ইসলাম",
        role: "মিরপুর, ঢাকা",
        quote:
            "অফিসে সারাদিন কম্পিউটারে কাজ করি, ঘাড়ের ব্যথায় ছিলাম অস্থির। নেক ম্যাসাজারটা নিয়ে প্রথম দিনই বুঝলাম টাকাটা উসুল হয়ে গেছে। হিট অপশনটা আসলেই কাজ করে। ডেলিভারিও পেয়ে গেছি মাত্র দুই দিনে।",
        rating: 5,
        avatar: "",
        order: 0,
    },
    {
        name: "সাদিয়া আফরিন মিতু",
        role: "উত্তরা, ঢাকা",
        quote:
            "স্বামীকে জন্মদিনে গিফট দিয়েছিলাম এই ম্যাসাজ গানটা। এখন ও রোজ রাতে ব্যবহার করে, ব্যায়ামের পর পেশি ব্যথায় দারুণ আরাম দেয়। প্যাকেজিং এত সুন্দর ছিল যে আলাদা গিফট র‍্যাপও করতে হয়নি। একবার চার্জ দিলে অনেকদিন চলে।",
        rating: 5,
        avatar: "",
        order: 1,
    },
    {
        name: "তানভীর হাসান সজীব",
        role: "চট্টগ্রাম",
        quote:
            "প্রথমে একটু সন্দেহ ছিল, এই দামে অনলাইনে ভালো জিনিস পাবো কি না। কিন্তু হাতে পেয়ে সন্দেহ কেটে গেছে — বিল্ড কোয়ালিটি মজবুত, বক্সের ভেতর সব ঠিকঠাক ছিল। ক্যাশ অন ডেলিভারিতে নিয়েছি, কোনো ঝামেলা হয়নি।",
        rating: 4,
        avatar: "",
        order: 2,
    },
    {
        name: "নুসরাত জাহান",
        role: "সিলেট",
        quote:
            "বাবার পায়ের ব্যথার জন্য ফুট ম্যাসাজারটা নিয়েছি। মা বলছেন বাবা এখন রোজ ব্যবহার করেন, রাতে ঘুমও ভালো হয়েছে। এই বয়সে বাবা-মাকে এমন একটা জিনিস উপহার দিতে পারায় মনটা ভালো আছে।",
        rating: 5,
        avatar: "",
        order: 3,
    },
    {
        name: "আরিফুল ইসলাম ভুঁইয়া",
        role: "রাজশাহী",
        quote:
            "জিম ট্রেনিং শেষে পেশি ব্যথা আমার জন্য বড় সমস্যা ছিল। এই ডিভাইসটা নেওয়ার পর রিকভারি অনেক দ্রুত হচ্ছে। ইনটেনসিটি লেভেলগুলো কাজের — আস্তে আস্তে বাড়িয়ে নিতে পারি, বডিতে চাপ না দিয়েই ভালো ম্যাসাজ পাওয়া যায়।",
        rating: 5,
        avatar: "",
        order: 4,
    },
    {
        name: "শারমিন সুলতানা",
        role: "মোহাম্মদপুর, ঢাকা",
        quote:
            "হেড ম্যাসাজারটা অর্ডার করার আগে ভাবসিলাম আরেকটা দেখানো পণ্য হবে। কিন্তু মাথা ব্যথার দিনে দশ মিনিট চালালে সত্যিই আরাম লাগে। এত ছোট যে ব্যাগে করে অফিসেও রাখি। এই দামে দুর্দান্ত।",
        rating: 4,
        avatar: "",
        order: 5,
    },
    {
        name: "মাহমুদুল হাসান রিয়াদ",
        role: "খুলনা",
        quote:
            "অর্ডার করার পর ফোনে কনফার্ম করে তারপর পাঠিয়েছে — এটা ভালো লেগেছে। পণ্য ঠিক সময়ে পেয়েছি, বক্স অক্ষত ছিল। প্রায় দুই মাস ধরে নিয়মিত ব্যবহার করছি, এখনো কোনো সমস্যা হয়নি। নিজের ভাইকেও নিতে বলেছি।",
        rating: 5,
        avatar: "",
        order: 6,
    },
    {
        name: "ফারজানা ইয়াসমিন",
        role: "বনানী, ঢাকা",
        quote:
            "মায়ের কোমর ব্যথার জন্য ডাক্তার ফিজিওথেরাপির পাশাপাশি বাসায় হালকা ম্যাসাজ সাজেস্ট করেছিলেন। এই মেশিনটা সেই কাজটাই করছে। অপারেশন এত সহজ যে মা নিজেই চালাতে পারেন। দামের তুলনায় কাজের জিনিস।",
        rating: 5,
        avatar: "",
        order: 7,
    },
    {
        name: "জুবায়ের আহমেদ",
        role: "ঢাকা",
        quote:
            "রাত জেগে কাজ করার পর ঘাড়-কাঁধ একদম শক্ত হয়ে যেত। এখন রোজ রাতে পনেরো মিনিট চালাই, সকালে মাথাটা অনেক ফ্রেশ লাগে। সাউন্ড খুব কম, বাসার সবাই ঘুমিয়ে থাকলেও ব্যবহার করতে পারি — এটা আমার কাছে বড় প্লাস।",
        rating: 5,
        avatar: "",
        order: 8,
    },
    {
        name: "রেহানা পারভীন",
        role: "কুমিল্লা",
        quote:
            "দামটা আমার বাজেটের মধ্যে ছিল, রিভিউগুলো দেখে সাহস করে নিয়েছি। ডেলিভারি ম্যান খুব ভদ্র ছিলেন, সামনে খুলে দেখে তারপর নিয়েছি। বাটনগুলো বোঝা সহজ। বাংলা ম্যানুয়ালটা থাকলে আরও ভালো হতো বড়দের জন্য।",
        rating: 4,
        avatar: "",
        order: 9,
    },
];

const seed = async () => {
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
        await mongoose.connect(config.db_url as string);

        const res = await Settings.updateOne(
            { _id: SETTINGS_ID },
            { $set: { "testimonials.items": testimonials } },
        );
        console.log(
            `testimonials seed — matched=${res.matchedCount} modified=${res.modifiedCount}`,
        );
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seed();
