/* eslint-disable @typescript-eslint/no-explicit-any */
import { TErrorSources, TGenericErrorResponse } from "../interface/error";

const handleDuplicateError = (err: any): TGenericErrorResponse => {
    // The duplicated value sits in keyValue ({ field: value }) and is also
    // quoted in the raw message — prefer keyValue so the FIELD is known.
    const field = Object.keys(err?.keyValue ?? {})[0] ?? "";
    const value = err?.keyValue?.[field] ?? err.message?.match(/"([^"]*)"/)?.[1];
    const friendlyField = field
        ? field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())
        : "Value";

    const message = field
        ? `${friendlyField} "${value}" is already taken , every SKU, slug, email and coupon code must be unique. HOW TO FIX: change it to a different value (or clear an auto-generated field so the system picks a fresh one).`
        : `"${value}" already exists , it must be unique. HOW TO FIX: use a different value.`;

    const errorSources: TErrorSources = [
        {
            path: field,
            message,
        },
    ];

    const statusCode = 400;

    return { statusCode, message, errorSources };
};

export default handleDuplicateError;
