import { Types } from "mongoose";

export const convertToObjectId = (id: string): Types.ObjectId => {
    return new Types.ObjectId(id);
};

export const calculatePercentageChange = (
    current: number,
    previous: number,
): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
};
