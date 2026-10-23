import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/appError";
import User from "../user/user.model";
import Product from "../product/product.model";
import Order from "../order/order.model";
import Brand from "../brand/brand.model";
import Category from "../category/category.model";
import Review from "../review/review.model";

const getMetaData = async () => {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const totalCategories = await Category.countDocuments({ isActive: true });
    const totalBrands = await Brand.countDocuments({ isActive: true });
    const totalReviews = await Review.countDocuments();

    // Calculate total revenue from completed orders
    const revenueResult = await Order.aggregate([
        { $match: { paymentStatus: "Paid" } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? Number((revenueResult[0].total).toFixed(2)) : 0;

    // Recent orders in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await Order.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
    });

    // Low stock products (< 5)
    const lowStockProducts = await Product.countDocuments({
        isActive: true,
        stock: { $lt: 5 },
    });

    return {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue,
        totalCategories,
        totalBrands,
        totalReviews,
        recentOrders,
        lowStockProducts,
    };
};

export const MetaServices = {
    getMetaData,
};
