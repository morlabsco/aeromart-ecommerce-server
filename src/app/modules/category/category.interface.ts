import { Document, Model, Types } from "mongoose";

export interface ICategory extends Document {
    name: string;
    slug: string;
    description: string;
    parent: Types.ObjectId | null;
    isActive: boolean;
    isDeleted: boolean;
    createdBy: Types.ObjectId;
    icon: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CategoryModel extends Model<ICategory> {
    checkCategoryExist(categoryId: string): Promise<ICategory>;
    isCategoryNameUnique(name: string, excludeId?: string): Promise<boolean>;
    isSlugUnique(slug: string, excludeId?: string): Promise<boolean>;
}
