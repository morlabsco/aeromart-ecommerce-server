// Niche presets — single source for seeding a fresh storefront.
// Source: src/docs/project-tracking/theme.config.ts (converted to the new
// Settings section shape: brand / hero.slides / about / contact / footer)
// plus a per-niche theme from settings.themes.ts so each niche has its own
// dynamic look (colors, fonts, radius).
//
// `applyNichePreset` (PATCH /settings/preset/:niche) writes ONLY the theme.
// `applyFullReset` (PATCH /settings/reset/:niche) writes the whole preset:
// theme + brand + hero + about + contact + footer + navbar + testimonials +
// limitedOffer, preserving brand.currency + brand.deliveryOptions when set.

import {
    IAboutSection,
    IBrandSettings,
    IContactSection,
    IFooterSection,
    IHeroSection,
    ILimitedOfferSection,
    INavbarSection,
    ITestimonialSection,
    IThemeSettings,
} from "./settings.interface";
import { nicheThemes } from "./settings.themes";

// Default store currency + delivery options shared by every niche preset.
// Admins can override them later via the settings update.
export const defaultCurrency: IBrandSettings["currency"] = "usd";

export const defaultDeliveryOptions: IBrandSettings["deliveryOptions"] = [
    { name: "Store Pickup", charge: 0, country: "", isActive: true },
    { name: "Inside Dhaka", charge: 90, country: "BD", isActive: true },
    { name: "Outside Dhaka", charge: 150, country: "BD", isActive: true },
    { name: "International", charge: 15, country: "", isActive: true },
];

// Standardized navbar for every niche — the main `links` are always visible;
// role-based `groups` provide Dashboard (customer vs admin differ) + auth.
const buildNavbar = (): INavbarSection => ({
    links: [
        { label: "Home", url: "/", order: 0, children: [] },
        { label: "Products", url: "/products", order: 1, children: [] },
        { label: "About", url: "/about", order: 2, children: [] },
        { label: "Contact", url: "/contact", order: 3, children: [] },
    ],
    // Public links live in `links` — the role `groups` only add role-specific
    // actions (login, dashboard + logout) on top of the always-visible links.
    groups: {
        auth: [{ label: "Login", url: "/login", order: 0, children: [] }],
        customer: [
            {
                label: "Dashboard",
                url: "/dashboard/customer",
                order: 0,
                children: [],
            },
            { label: "Logout", url: "/logout", order: 1, children: [] },
        ],
        admin: [
            {
                label: "Dashboard",
                url: "/dashboard/admin",
                order: 0,
                children: [],
            },
            { label: "Logout", url: "/logout", order: 1, children: [] },
        ],
    },
});

// Standardized footer for every niche: Quick Links + Shop + Contact columns,
// social links, copyright, newsletter.
const buildFooter = (): IFooterSection => ({
    description:
        "Quality products curated for your lifestyle. Shop with confidence and enjoy fast, reliable delivery.",
    columns: [
        {
            title: "Quick Links",
            links: [
                { label: "Home", url: "/" },
                { label: "Products", url: "/products" },
                { label: "About", url: "/about" },
                { label: "Contact", url: "/contact" },
            ],
        },
        {
            title: "Shop",
            links: [
                { label: "All Products", url: "/products" },
                { label: "New Arrivals", url: "/products?sort=-createdAt" },
                { label: "Best Sellers", url: "/products?sort=-sold" },
            ],
        },
        {
            title: "Contact",
            links: [
                { label: "About Us", url: "/about" },
                { label: "Contact Us", url: "/contact" },
                { label: "FAQ", url: "/faq" },
            ],
        },
    ],
    socialLinks: [
        { platform: "twitter", url: "https://twitter.com/attor" },
        { platform: "instagram", url: "https://instagram.com/attor" },
        { platform: "facebook", url: "https://facebook.com/attor" },
    ],
    copyrightText: "© 2026 Attor. All rights reserved.",
    newsletter: {
        enabled: true,
        heading: "Subscribe for exclusive offers",
    },
});

// Default testimonials (niche-agnostic but themed by brand).
const buildTestimonials = (): ITestimonialSection => ({
    heading: "What Our Customers Say",
    items: [
        {
            name: "Ayesha Rahman",
            role: "Verified Buyer",
            quote: "Outstanding quality and lightning-fast delivery. Highly recommended!",
            rating: 5,
            avatar: "",
            order: 0,
        },
        {
            name: "John Carter",
            role: "Verified Buyer",
            quote: "The customer service team went above and beyond. Will shop again.",
            rating: 5,
            avatar: "",
            order: 1,
        },
        {
            name: "Maria Lopez",
            role: "Verified Buyer",
            quote: "Beautiful products at a fair price. Exactly as described.",
            rating: 4,
            avatar: "",
            order: 2,
        },
    ],
});

const buildLimitedOffer = (): ILimitedOfferSection => ({
    enabled: false,
    badge: "Limited Time",
    title: "Seasonal Sale",
    subtitle: "Up to 30% off selected items",
    ctaText: "Shop Now",
    ctaLink: "/products",
    image: "",
    endsAt: "",
});

export interface ISettingsPreset {
    brand: IBrandSettings;
    theme: IThemeSettings;
    hero: IHeroSection;
    about: IAboutSection;
    contact: IContactSection;
    footer: IFooterSection;
    navbar: INavbarSection;
    testimonials: ITestimonialSection;
    limitedOffer: ILimitedOfferSection;
}

export const DEFAULT_NICHE = "clothing";

// Helper to build a complete preset with per-niche content + shared chrome.
const buildPreset = (
    niche: string,
    nicheLabel: string,
    brandName: string,
    theme: IThemeSettings,
    brand: Partial<IBrandSettings>,
    hero: IHeroSection,
    about: IAboutSection,
    contact: IContactSection,
): ISettingsPreset => ({
    theme,
    brand: {
        name: brandName,
        tagline: "",
        description: "",
        niche,
        nicheLabel,
        logo: `/demo/${niche}/logo.svg`,
        favicon: "",
        currency: defaultCurrency,
        deliveryOptions: defaultDeliveryOptions,
        ...brand,
    },
    hero,
    about,
    contact,
    footer: buildFooter(),
    navbar: buildNavbar(),
    testimonials: buildTestimonials(),
    limitedOffer: buildLimitedOffer(),
});

export const settingsPresets: Record<string, ISettingsPreset> = {
    shoes: buildPreset(
        "shoes",
        "Shoes",
        "Solemate",
        nicheThemes.shoes,
        {
            tagline: "Step Into Greatness",
            description: "Premium footwear for every step of your journey.",
            logo: "/demo/shoes/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/shoes/hero-1.webp",
                    headline: "Walk the Talk in Style",
                    subtext:
                        "From everyday sneakers to statement kicks — find the pair that moves with you.",
                    ctaText: "Shop Now",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/shoes/hero-2.webp",
                    headline: "Built for Performance",
                    subtext:
                        "Engineered cushioning and grip for the streets, the gym, and everything between.",
                    ctaText: "Shop Performance",
                    ctaLink: "/products?category=performance",
                    order: 1,
                },
            ],
        },
        {
            story:
                "Solemate was founded on one simple idea: great shoes shouldn't be a luxury. Since 2021 we've partnered with craftsmen and athletes to design footwear that balances comfort, durability, and style.",
            mission:
                "Our mission is to put quality footwear on every foot — combining honest pricing, modern design, and materials that last.",
            image: "/demo/shoes/about.jpg",
            stats: [
                { label: "Founded", value: "2021" },
                { label: "Pairs Sold", value: "50K+" },
            ],
        },
        {
            address: "78 Kicks Lane, Portland, OR 97201",
            phone: "+1 (555) 234-5678",
            email: "hello@solemate.com",
            hours: "Mon–Sat 9am–7pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/solemate",
                instagram: "https://instagram.com/solemate",
                facebook: "https://facebook.com/solemate",
            },
        },
    ),
    watches: buildPreset(
        "watches",
        "Watches",
        "Attor Time",
        nicheThemes.watches,
        {
            tagline: "Time, Perfected",
            description: "Precision timepieces for the discerning collector.",
            logo: "/demo/watches/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/watches/hero-1.webp",
                    headline: "Craftsmanship on Your Wrist",
                    subtext:
                        "Automatic, quartz, and smart — every Attor Time piece is built to last generations.",
                    ctaText: "Explore Collection",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/watches/hero-2.webp",
                    headline: "The Art of Precision",
                    subtext:
                        "Sapphire glass, Swiss movement, timeless design. Time is precious — wear it well.",
                    ctaText: "Shop Luxury",
                    ctaLink: "/products?category=luxury",
                    order: 1,
                },
            ],
        },
        {
            story:
                "Attor Time began in a small workshop in 2019 with a passion for horology. We believe a watch is more than a tool — it's a companion through life's moments, big and small.",
            mission:
                "To craft timepieces that blend heritage craftsmanship with modern precision, making luxury watchmaking accessible to all.",
            image: "/demo/watches/about.jpg",
            stats: [
                { label: "Founded", value: "2019" },
                { label: "Movements", value: "25+" },
            ],
        },
        {
            address: "12 Chrono Avenue, Geneva, CH",
            phone: "+41 (555) 123-4567",
            email: "hello@attortime.com",
            hours: "Mon–Fri 10am–6pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/attortime",
                instagram: "https://instagram.com/attortime",
                facebook: "https://facebook.com/attortime",
            },
        },
    ),
    eyewear: buildPreset(
        "eyewear",
        "Eyewear",
        "Attor Optics",
        nicheThemes.eyewear,
        {
            tagline: "See Clearly, Look Sharp",
            description: "Premium eyewear for the discerning eye.",
            logo: "/demo/eyewear/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/eyewear/hero.jpg",
                    headline: "Frame Your World in Style",
                    subtext:
                        "Handcrafted eyewear that blends precision optics with bold design.",
                    ctaText: "Browse Frames",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/eyewear/cat-sunglasses.jpg",
                    headline: "Sun's Out, Style On",
                    subtext:
                        "UV protection with undeniable attitude. Our sunglasses collection has you covered.",
                    ctaText: "Shop Sunglasses",
                    ctaLink: "/products?category=sunglasses",
                    order: 1,
                },
                {
                    image: "/demo/eyewear/cat-optical.jpg",
                    headline: "See the Difference",
                    subtext:
                        "Everyday optical frames engineered for comfort and clarity.",
                    ctaText: "Shop Optical",
                    ctaLink: "/products?category=optical",
                    order: 2,
                },
            ],
        },
        {
            story:
                "Attor Optics began with a clear vision: create eyewear that's as functional as it is beautiful. Since 2021, we've partnered with master craftsmen to produce frames that balance precision optics with distinctive design.",
            mission:
                "Great vision deserves great frames. We're on a mission to make premium eyewear accessible.",
            image: "/demo/eyewear/about.jpg",
            stats: [
                { label: "Founded", value: "2021" },
                { label: "Frames", value: "120+" },
            ],
        },
        {
            address: "456 Vision Drive, San Francisco, CA 94102",
            phone: "+1 (555) 987-6543",
            email: "hello@attoroptics.com",
            hours: "Mon–Sat 10am–7pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/attoroptics",
                instagram: "https://instagram.com/attoroptics",
                facebook: "https://facebook.com/attoroptics",
            },
        },
    ),
    clothing: buildPreset(
        "clothing",
        "Clothing",
        "Attor",
        nicheThemes.clothing,
        {
            tagline: "Define Your Style",
            description: "Premium clothing for the modern individual.",
            logo: "/demo/clothing/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/clothing/hero-1.webp",
                    headline: "Elevate Your Everyday Style",
                    subtext:
                        "Discover curated collections designed for those who refuse to blend in.",
                    ctaText: "Shop Collection",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/clothing/hero-2.webp",
                    headline: "Crafted for the Modern Man",
                    subtext:
                        "Sharp tailoring meets everyday comfort.",
                    ctaText: "Shop Men",
                    ctaLink: "/products?category=men",
                    order: 1,
                },
                {
                    image: "/demo/clothing/hero-3.webp",
                    headline: "Effortless Style, Redefined",
                    subtext:
                        "Our women's line is designed to move with you, not against you.",
                    ctaText: "Shop Women",
                    ctaLink: "/products?category=women",
                    order: 2,
                },
            ],
        },
        {
            story:
                "Attor was born from a simple belief: what you wear speaks before you do. Founded in 2020, we set out to create clothing that bridges timeless craftsmanship and modern sensibility.",
            mission:
                "Style shouldn't come at the expense of comfort, and quality shouldn't be a luxury. We outfit the world with confidence.",
            image: "/demo/clothing/about.jpg",
            stats: [
                { label: "Founded", value: "2020" },
                { label: "Collections", value: "50+" },
            ],
        },
        {
            address: "123 Fashion Avenue, New York, NY 10001",
            phone: "+1 (555) 123-4567",
            email: "hello@attor.com",
            hours: "Mon–Sat 9am–6pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/attor",
                instagram: "https://instagram.com/attor",
                facebook: "https://facebook.com/attor",
            },
        },
    ),
    electronics: buildPreset(
        "electronics",
        "Electronics",
        "VoltEdge",
        nicheThemes.electronics,
        {
            tagline: "Power Your Future",
            description: "Cutting-edge electronics and smart gadgets.",
            logo: "/demo/electronics/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/electronics/hero-1.webp",
                    headline: "Tomorrow's Tech, Today",
                    subtext:
                        "From smart home to high-performance gear — stay ahead of the curve.",
                    ctaText: "Shop Now",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/electronics/hero-2.webp",
                    headline: "Built for Creators",
                    subtext:
                        "Cameras, audio, and accessories engineered for people who make things.",
                    ctaText: "Shop Creator Kit",
                    ctaLink: "/products?category=creators",
                    order: 1,
                },
            ],
        },
        {
            story:
                "VoltEdge was founded by engineers who were tired of overpriced, under-delivering tech. Since 2020, we've curated and developed products that deliver real performance at honest prices.",
            mission:
                "To make cutting-edge technology accessible — rigorously tested, fairly priced, and built to last.",
            image: "/demo/electronics/about.jpg",
            stats: [
                { label: "Founded", value: "2020" },
                { label: "Products", value: "300+" },
            ],
        },
        {
            address: "900 Circuit Blvd, Austin, TX 78701",
            phone: "+1 (555) 345-6789",
            email: "support@voltedge.com",
            hours: "Mon–Fri 9am–8pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/voltedge",
                instagram: "https://instagram.com/voltedge",
                facebook: "https://facebook.com/voltedge",
            },
        },
    ),
    pet_animal: buildPreset(
        "pet_animal",
        "Pet & Animal",
        "PawCare",
        nicheThemes.petAnimal,
        {
            tagline: "Everything for Your Companion",
            description: "Food, toys, and care essentials for happy pets.",
            logo: "/demo/pet_animal/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/pet_animal/hero-1.webp",
                    headline: "Happy Paws, Happy Home",
                    subtext:
                        "Nutrition, toys, and care essentials your furry friends will love.",
                    ctaText: "Shop Now",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/pet_animal/hero-2.webp",
                    headline: "Care That Cares Back",
                    subtext:
                        "Vet-approved products and honest advice for every stage of your pet's life.",
                    ctaText: "Shop Pet Care",
                    ctaLink: "/products?category=care",
                    order: 1,
                },
            ],
        },
        {
            story:
                "PawCare started with one rescue dog named Milo and a belief that pets deserve better. Today we serve thousands of pet parents with carefully chosen, vet-approved products.",
            mission:
                "To make premium pet care accessible and to support animal welfare with every purchase.",
            image: "/demo/pet_animal/about.jpg",
            stats: [
                { label: "Founded", value: "2019" },
                { label: "Pets Helped", value: "10K+" },
            ],
        },
        {
            address: "45 Wagging Tail Rd, Denver, CO 80201",
            phone: "+1 (555) 456-7890",
            email: "hello@pawcare.com",
            hours: "Mon–Sun 8am–8pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/pawcare",
                instagram: "https://instagram.com/pawcare",
                facebook: "https://facebook.com/pawcare",
            },
        },
    ),
    furniture: buildPreset(
        "furniture",
        "Furniture",
        "Hearth & Home",
        nicheThemes.furniture,
        {
            tagline: "Design Your Space",
            description: "Timeless furniture for modern living.",
            logo: "/demo/furniture/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/furniture/hero-1.webp",
                    headline: "Spaces That Inspire",
                    subtext:
                        "Sustainably sourced, beautifully crafted furniture for every room.",
                    ctaText: "Shop Now",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/furniture/hero-2.webp",
                    headline: "Crafted to Last Generations",
                    subtext:
                        "Solid wood, honest joinery, and designs that never go out of style.",
                    ctaText: "Shop Living Room",
                    ctaLink: "/products?category=living",
                    order: 1,
                },
            ],
        },
        {
            story:
                "Hearth & Home was founded by carpenters with a passion for sustainable design. Every piece is made from responsibly sourced materials and built to be passed down.",
            mission:
                "To bring warm, durable, beautifully crafted furniture into every home without harming the planet.",
            image: "/demo/furniture/about.jpg",
            stats: [
                { label: "Founded", value: "2018" },
                { label: "Trees Planted", value: "5K+" },
            ],
        },
        {
            address: "300 Oak Street, Asheville, NC 28801",
            phone: "+1 (555) 567-8901",
            email: "hello@hearthandhome.com",
            hours: "Mon–Sat 10am–6pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/hearthhome",
                instagram: "https://instagram.com/hearthhome",
                facebook: "https://facebook.com/hearthhome",
            },
        },
    ),
    cosmetics: buildPreset(
        "cosmetics",
        "Cosmetics",
        "Lumière",
        nicheThemes.cosmetics,
        {
            tagline: "Beauty, Amplified",
            description: "Clean, cruelty-free cosmetics that celebrate you.",
            logo: "/demo/cosmetics/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/cosmetics/hero-1.webp",
                    headline: "Glow on Your Terms",
                    subtext:
                        "Clean, cruelty-free beauty products formulated with skin-loving ingredients.",
                    ctaText: "Shop Now",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/cosmetics/hero-2.webp",
                    headline: "The Lumière Ritual",
                    subtext:
                        "From skincare to makeup — a complete ritual for radiant, confident you.",
                    ctaText: "Shop Skincare",
                    ctaLink: "/products?category=skincare",
                    order: 1,
                },
            ],
        },
        {
            story:
                "Lumière began in a kitchen with a single lip balm recipe. Today we formulate clean, effective cosmetics that are kind to your skin and the planet — never tested on animals.",
            mission:
                "To prove that clean beauty can be powerful, inclusive, and luxurious.",
            image: "/demo/cosmetics/about.jpg",
            stats: [
                { label: "Founded", value: "2020" },
                { label: "Cruelty-Free", value: "100%" },
            ],
        },
        {
            address: "88 Glow Street, Los Angeles, CA 90001",
            phone: "+1 (555) 678-9012",
            email: "hello@lumiere.com",
            hours: "Mon–Fri 9am–6pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/lumiere",
                instagram: "https://instagram.com/lumiere",
                facebook: "https://facebook.com/lumiere",
            },
        },
    ),
    sports: buildPreset(
        "sports",
        "Sports",
        "Velocity",
        nicheThemes.sports,
        {
            tagline: "Go Faster, Go Further",
            description: "Performance gear for athletes of every level.",
            logo: "/demo/sports/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/sports/hero-1.webp",
                    headline: "Train Like a Champion",
                    subtext:
                        "Performance apparel and equipment trusted by athletes everywhere.",
                    ctaText: "Shop Now",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/sports/hero-2.webp",
                    headline: "Gear Up for Game Day",
                    subtext:
                        "From the track to the court — gear that keeps up with your ambition.",
                    ctaText: "Shop Equipment",
                    ctaLink: "/products?category=equipment",
                    order: 1,
                },
            ],
        },
        {
            story:
                "Velocity was built by athletes, for athletes. We test every product in real training conditions so you can perform at your best when it counts.",
            mission:
                "To equip every athlete — from weekend warriors to pros — with gear that performs as hard as they do.",
            image: "/demo/sports/about.jpg",
            stats: [
                { label: "Founded", value: "2017" },
                { label: "Athletes", value: "100K+" },
            ],
        },
        {
            address: "500 Sprint Way, Boulder, CO 80301",
            phone: "+1 (555) 789-0123",
            email: "team@velocity.com",
            hours: "Mon–Sat 8am–8pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/velocity",
                instagram: "https://instagram.com/velocity",
                facebook: "https://facebook.com/velocity",
            },
        },
    ),
    jewelry: buildPreset(
        "jewelry",
        "Jewelry",
        "Aurelia",
        nicheThemes.jewelry,
        {
            tagline: "Adorn the Moment",
            description: "Fine jewelry crafted to be treasured forever.",
            logo: "/demo/jewelry/logo.svg",
        },
        {
            slides: [
                {
                    image: "/demo/jewelry/hero-1.webp",
                    headline: "Timeless Pieces, Modern Hearts",
                    subtext:
                        "Ethically sourced fine jewelry crafted by master artisans.",
                    ctaText: "Shop Now",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/jewelry/hero-2.webp",
                    headline: "Celebrate the Extraordinary",
                    subtext:
                        "Engagement, gifts, and everyday elegance — pieces that tell your story.",
                    ctaText: "Shop Engagement",
                    ctaLink: "/products?category=engagement",
                    order: 1,
                },
            ],
        },
        {
            story:
                "Aurelia was founded on a belief that fine jewelry should be both beautiful and ethical. Every piece is crafted with responsibly sourced stones and recycled metals.",
            mission:
                "To create heirloom-quality jewelry that honors craftsmanship, ethics, and the moments that matter.",
            image: "/demo/jewelry/about.jpg",
            stats: [
                { label: "Founded", value: "2016" },
                { label: "Artisans", value: "40+" },
            ],
        },
        {
            address: "1 Diamond Row, New York, NY 10013",
            phone: "+1 (555) 890-1234",
            email: "hello@aurelia.com",
            hours: "Mon–Sat 10am–7pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/aurelia",
                instagram: "https://instagram.com/aurelia",
                facebook: "https://facebook.com/aurelia",
            },
        },
    ),
    perfume_oil: buildPreset(
        "perfume_oil",
        "Perfume Oil",
        "Attor",
        nicheThemes.perfume_oil,
        {
            tagline: "Essence of Distinction",
            description: "Premium perfume oils crafted for the discerning.",
            logo: "/demo/perfume-oil/logo.png",
        },
        {
            slides: [
                {
                    image: "/demo/perfume-oil/banner/hero-1.webp",
                    headline: "Discover Your Signature Scent",
                    subtext:
                        "Explore our curated collection of artisanal perfume oils — from deep, smoky ouds to luminous florals. Find the fragrance that speaks to you.",
                    ctaText: "Explore Collection",
                    ctaLink: "/products",
                    order: 0,
                },
                {
                    image: "/demo/perfume-oil/banner/hero-2.webp",
                    headline: "The Art of Oud",
                    subtext:
                        "Journey through our collection of rare and precious oud oils — aged, layered, and utterly unforgettable.",
                    ctaText: "Shop Oud Collection",
                    ctaLink: "/products?category=oud",
                    order: 1,
                },
                {
                    image: "/demo/perfume-oil/banner/hero-3.webp",
                    headline: "Bloom in Every Drop",
                    subtext:
                        "From Damask rose to jasmine sambac — our floral attars capture nature's most exquisite moments in every bottle.",
                    ctaText: "Shop Florals",
                    ctaLink: "/products?category=floral",
                    order: 2,
                },
            ],
        },
        {
            story:
                "Attor began with a passion for the ancient art of perfumery. Rooted in tradition yet crafted for the modern connoisseur, each of our perfume oils is a journey — from the misty forests of Assam to the sun-drenched gardens of Grasse. We work directly with distillers and growers to bring you the purest expressions of nature's most precious botanicals.",
            mission:
                "We believe fragrance is the most intimate form of expression. Our mission is to make artisanal perfume oils accessible — offering uncompromising quality, ethical sourcing, and a sensory experience that transcends the ordinary.",
            image: "/demo/perfume-oil/about.jpeg",
            stats: [
                { label: "Founded", value: "2018" },
                { label: "Oud Variants", value: "30+" },
            ],
        },
        {
            address: "123 Perfume Avenue, New York, NY 10001",
            phone: "+1 (555) 123-4567",
            email: "hello@attor.com",
            hours: "Mon–Sat 9am–6pm",
            mapEmbedUrl: "",
            social: {
                twitter: "https://twitter.com/attor",
                instagram: "https://instagram.com/attor",
                facebook: "https://facebook.com/attor",
            },
        },
    ),
};
