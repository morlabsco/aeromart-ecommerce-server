import { Document, Model, Types } from "mongoose";

export interface IBrand extends Document {
    name: string;
    description: string;
    logo: string;
    isActive: boolean;
    isDeleted: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface BrandModel extends Model<IBrand> {
    checkBrandExist(brandId: string): Promise<IBrand>;
    isBrandNameUnique(name: string, excludeId?: string): Promise<boolean>;
}
