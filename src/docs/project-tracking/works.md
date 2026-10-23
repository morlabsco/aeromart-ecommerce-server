Started at: 14/08/2026
Updated at: 23/10/2026
Ended at: 15/08/2026

# Rules
1. Follow code standards of this project and code quality should be readable, maintainable.
2. Use codebase-memory-mcp server to read files, look for modules, functions, context and don't use traditional file reading which consumes tokens.
3. Maintain edge-cases, code quality, readability, and reusability.
4. Follow the top 3 rules strictly.

## Work 1

### Future Fixes (Later)

1. **Payment issue** — SSLCommerz is not initializing payments. It appears they updated from v3 to v4; research the API changes first.


## Personal Marks

### Completed

1. ✅ **User module — profile photo removal** — Users can remove their profile photo by sending photoUrl: "", which is accepted and sets the photoUrl property to null.
2. ✅ **Settings brand theme — currency** — Currency is now a single value (e.g. "usd", "bdt").
3. ✅ **Product create/update** — Size- and color-wise variants: imageUrls with keep/remove handling, variant images, and offerPrice.
4. ✅ **Order create** — Orders now support variants and offerPrice.
5. ✅ **Settings theme presets** — The default preset now has all sections filled; kept 10 popular niche theme presets; added a reset option that clears the theme.
6. ✅ **Product server communication error** — Fixed the "An error occurred in the Server Components render" error. Cause: the production origin was not added to the CORS origin list.
