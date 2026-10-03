import Category from '../models/Category.js';
import { sendSuccess } from '../utils/response.js';

const DEFAULT_CATEGORIES = [
  { id: 'bua', nameEn: 'House Maid / Bua', nameBn: 'কাজের বুয়া / গৃহকর্মী', emoji: '🧹', order: 1 },
  { id: 'cook', nameEn: 'Cook / Chef', nameBn: 'বাবুর্চি / রাঁধুনি', emoji: '🍳', order: 2 },
  { id: 'darowan', nameEn: 'Security Guard / Darowan', nameBn: 'দারোয়ান / সিকিউরিটি গার্ড', emoji: '🛡️', order: 3 },
  { id: 'caretaker', nameEn: 'Baby Care / Caretaker', nameBn: 'বেবি কেয়ার / কেয়ারটেকার', emoji: '🧑‍🍼', order: 4 },
  { id: 'driver', nameEn: 'Personal Driver', nameBn: 'ড্রাইভার', emoji: '🚗', order: 5 },
  { id: 'cleaner', nameEn: 'Deep Cleaner', nameBn: 'ক্লিনার', emoji: '🧼', order: 6 },
  { id: 'laundry', nameEn: 'Laundry / Iron', nameBn: 'লন্ড্রি / ইস্ত্রি', emoji: '👕', order: 7 },
  { id: 'gardener', nameEn: 'Gardener / Mali', nameBn: 'মালী / বাগান পরিচর্যাকারী', emoji: '🌿', order: 8 },
  { id: 'electrician', nameEn: 'Electrician', nameBn: 'ইলেকট্রিশিয়ান', emoji: '💡', order: 9 },
  { id: 'plumber', nameEn: 'Plumber', nameBn: 'প্লাম্বার', emoji: '🔧', order: 10 },
  { id: 'technician', nameEn: 'AC / Fridge Technician', nameBn: 'টেকনিশিয়ান', emoji: '❄️', order: 11 },
  { id: 'tutor', nameEn: 'Home Tutor', nameBn: 'হোম টিউটর', emoji: '📚', order: 12 },
  { id: 'labour', nameEn: 'Labour / Shifting', nameBn: 'বাসা শিফটিং শ্রমিক', emoji: '📦', order: 13 },
  { id: 'tiffin', nameEn: 'Tiffin / Home Food', nameBn: 'হোম টিফিন ডেলিভারি', emoji: '🍱', order: 14 },
  { id: 'pest', nameEn: 'Pest Control', nameBn: 'পোকামাকড় দমন', emoji: '🐜', order: 15 },
  { id: 'painter', nameEn: 'House Painter', nameBn: 'রং মিস্ত্রি', emoji: '🎨', order: 16 },
];

export async function getCategories(_req, res, next) {
  try {
    let categories = await Category.find({ isActive: true }).sort({ order: 1 }).lean();

    // Auto-seed if empty
    if (!categories.length) {
      try {
        await Category.insertMany(DEFAULT_CATEGORIES);
        categories = await Category.find({ isActive: true }).sort({ order: 1 }).lean();
      } catch {
        categories = DEFAULT_CATEGORIES;
      }
    }

    return sendSuccess(res, {
      message: 'Categories retrieved successfully.',
      data: { categories },
    });
  } catch (err) {
    return next(err);
  }
}
