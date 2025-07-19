import Review from '../model/ReviewModel.js';
import {Transaction} from '../model/TransactionModel.js'; 
import {BuildTransaction} from '../model/BuildTransactionModel.js';
import Product from "../model/productModel.js";
import mongoose from "mongoose";
import User from '../model/userModel.js';

// export const createReview = async (req, res) => {
//   try {
//     const { productId, orderId, type, rating, comment } = req.body;
//     const userId = req.user.id;  

//     console.log("Logged in user id:", userId); // Debug log

//     // Validate ObjectId format
//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       return res.status(400).json({ message: "Invalid order ID format." });
//     }

//     // Fetch order
//     const order = await Transaction.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: "Order not found." });
//     }

//     // Check if order belongs to this user
//     if (!order.user_id || order.user_id.toString() !== userId.toString()) {
//       return res.status(403).json({ message: "You have not purchased this product." });
//     }

//     // Check if product is in order items
//     const hasProduct = order.items.some(item => item._id.toString() === productId.toString());
//     if (!hasProduct) {
//       return res.status(403).json({ message: "Product not found in your order." });
//     }

//     // Check for existing review (for this product, order, and user)
//     const existingReview = await Review.findOne({ productId, orderId, userId });
//     if (existingReview) {
//       return res.status(400).json({ message: "You have already reviewed this product in this order." });
//     }

//     // Save new review
//     const review = new Review({
//       productId,
//       orderId,
//       userId,
//       type,
//       rating,
//       comment,
//     });

//     await review.save();
//     res.status(201).json(review);

//   } catch (err) {
//     console.error("Error in creating review:", err);
//     res.status(500).json({ message: "An error occurred while creating the review." });
//   }
// };

// Get reviews for a product
export const createReview = async (req, res) => {
  try {
    const { productId, orderId, type, rating, comment } = req.body;
    const userId = req.user.id;

    console.log("Logged in user id:", userId);

    // Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format." });
    }

    if (type === "product") {
      // Validate product review requirements
      if (!productId) {
        return res.status(400).json({ message: "productId is required for product reviews." });
      }

      // Fetch product order
      const order = await Transaction.findById(orderId);
      if (!order) return res.status(404).json({ message: "Order not found." });

      if (order.user_id.toString() !== userId.toString()) {
        return res.status(403).json({ message: "You have not purchased this product." });
      }

      const hasProduct = order.items.some(item => item._id.toString() === productId);
      if (!hasProduct) {
        return res.status(403).json({ message: "Product not found in your order." });
      }

      // Check existing review
      const existingReview = await Review.findOne({ productId, orderId, userId });
      if (existingReview) {
        return res.status(400).json({ message: "You have already reviewed this product in this order." });
      }

      // Create review
      const review = new Review({
        type,
        productId,
        orderId,
        userId,
        rating,
        comment,
      });

      await review.save();
      return res.status(201).json(review);

    } else if (type === "pc_build") {
      // Fetch build order
      const buildOrder = await BuildTransaction.findById(orderId);
      if (!buildOrder) return res.status(404).json({ message: "Build order not found." });

      if (buildOrder.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "You have not purchased this build." });
      }

      // Check existing build review
      const existingReview = await Review.findOne({ orderId, userId, type: "pc_build" });
      if (existingReview) {
        return res.status(400).json({ message: "You have already reviewed this build." });
      }

      // Create build review (no productId needed)
      const review = new Review({
        type,
        orderId,
        userId,
        rating,
        comment,
      });

      await review.save();
      return res.status(201).json(review);

    } else {
      return res.status(400).json({ message: "Invalid review type provided." });
    }

  } catch (err) {
    console.error("Error in creating review:", err);
    res.status(500).json({ message: "An error occurred while creating the review." });
  }
};

export const getProductReviews = async (req, res) => {
    
    console.log('Received request for product ID:', req.params.productId);

    try {
      const reviews = await Review.find({ productId: req.params.productId }).populate('userId', 'name');
    
      console.log('Reviews fetched:', reviews);  // Log the result of the query
      if (!reviews) {
        return res.status(404).json({ message: 'No reviews found for this product' });
      }
      res.status(200).json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);  
      res.status(500).json({ message: error.message });
    }
  };
  

  export const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch product transactions for user
    const transactions = await Transaction.find({ user_id: userId });

    // Build a flat array of purchased items with their order (transaction) id
    const purchasedProductItems = transactions.flatMap((tx) =>
      tx.items.map((item) => ({
        type: "product",
        productId: item._id.toString(),
        orderId: tx._id.toString(),
      }))
    );

    // Fetch build transactions for user
    const buildTransactions = await BuildTransaction.find({ userId: userId });

    // Build a flat array of purchased PC builds
    const purchasedBuilds = buildTransactions.map((buildTx) => ({
      type: "pc_build",
      orderId: buildTx._id.toString(),
      buildName: buildTx.buildName,
      buildImage: buildTx.buildImage,
      price: buildTx.TotalPrice,
    }));

    // Fetch all reviews by user
    const reviews = await Review.find({ userId: userId });

    // Fetch product details for purchased products
    const products = await Product.find({
      _id: { $in: purchasedProductItems.map((i) => i.productId) },
    }).select("name price img_urls");

    // Combine: product reviews
    const productResults = products.map((product) => {
      const purchaseInfo = purchasedProductItems.find(
        (i) => i.productId === product._id.toString()
      );

      const review = reviews.find(
        (r) => r.productId === product._id.toString() && r.type === "product"
      );

      return {
        type: "product",
        orderId: purchaseInfo?.orderId || null, 
        productId: product._id,
        name: product.name,
        price: product.price,
        product_image: product.img_urls?.[0]?.url || null,
        reviewId: review?._id || null,
        rating: review?.rating || null,
        comment: review?.comment || null,
        createdAt: review?.createdAt || null,
        status: review ? "Reviewed" : "To Review",
      };
    });

     // Combine: build reviews
    const buildResults = purchasedBuilds.map((build) => {
      const review = reviews.find(
        (r) => r.orderId === build.orderId && r.type === "pc_build"
      );

      return {
        type: "pc_build",
        orderId: build.orderId,
        name: build.buildName || "Custom PC Build",
        product_image: build.buildImage || null,
        price: build.price || 0,
        reviewId: review?._id || null,
        rating: review?.rating || null,
        comment: review?.comment || null,
        createdAt: review?.createdAt || null,
        status: review ? "Reviewed" : "To Review",
      };
    });

    // Merge product and build reviews
    const result = [...productResults, ...buildResults];

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// // Get logged-in user's reviews
// export const getMyReviews = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Fetch transactions for user
//     const transactions = await Transaction.find({ user_id: userId });

//     // Get all product IDs from transactions
//     const purchasedProductIds = transactions.flatMap((tx) =>
//       tx.items.map((item) => item._id)
//     );

//     // Fetch all reviews by user
//     const reviews = await Review.find({ userId: userId });

//     // Fetch product details for purchased products
//     const products = await Product.find({
//       _id: { $in: purchasedProductIds },
//     }).select("name price img_urls");

//     // Combine: mark reviewed status
//     const result = products.map((product) => {
//       const review = reviews.find(
//         (r) => r.productId === product._id.toString()
//       );
//       return {
//         productId: product._id,
//         name: product.name,
//         price: product.price,
//         product_image: product.img_urls?.[0]?.url || null,
//         reviewId: review?._id || null,
//         rating: review?.rating || null,
//         comment: review?.comment || null,
//         createdAt: review?.createdAt || null,
//         status: review ? "Reviewed" : "To Review",
//       };
//     });

//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// export const getMyReviews = async (req, res) => {
//   try {
//     const reviews = await Review.aggregate([
//       {
//         $match: { userId: new mongoose.Types.ObjectId(req.user.id) }
//       },
//       {
//         $addFields: {
//           productObjectId: { $toObjectId: "$productId" }
//         }
//       },
//       {
//         $lookup: {
//           from: "products", 
//           localField: "productObjectId",
//           foreignField: "_id",
//           as: "productDetails"
//         }
//       },
//       { $unwind: "$productDetails" },
//       {
//         $project: {
//           rating: 1,
//           comment: 1,
//           createdAt: 1,
//           productId: 1,
//           "productDetails.name": 1,
//           "productDetails.price": 1,
//           "productDetails.img_urls.url": 1
//         }
//       }
//     ]);

//     res.status(200).json(reviews);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// Update review
export const updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.comment = req.body.comment || review.comment;
    review.rating = req.body.rating || review.rating;

    await review.save();

    res.status(200).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//Admin side

// Get all reviews (admin)

// export const getAllReviewsAdmin = async (req, res) => {
//   try {
//     const { productId, rating, userId , type , orderId } = req.query;
//     const filter = {};

//     if (productId) filter.productId = productId;
//     if (orderId) filter.orderId = orderId;
//     if (rating) filter.rating = rating;
//     if (userId) filter.userId = userId;

//     // Step 1: Get all reviews with filters
//     const reviews = await Review.find(filter)
//       .populate('userId', 'name email profilePicture')
//       .sort({ createdAt: -1 });

//     // Step 2: For each review, fetch order -> find item -> extract name/category
//     const enhancedReviews = await Promise.all(
//       reviews.map(async (review) => {
//         const order = await Transaction.findById(review.orderId);

//         if (!order) return { ...review.toObject(), productName: null, productCategory: null };

//         const matchedItem = order.items.find(
//           item => item._id.toString() === review.orderId.toString()
//         );

//         return {
//           ...review.toObject(),
//           productName: matchedItem?.name || null,
//           productCategory: matchedItem?.category || null,
//         };
//       })
//     );

//     res.status(200).json(enhancedReviews);
//   } catch (error) {
//     console.error('Error fetching all reviews for admin:', error);
//     res.status(500).json({ message: error.message });
//   }
// };
export const getAllReviewsAdmin = async (req, res) => {
  try {
    const { productId, rating, userId, type, orderId, search, date } = req.query;

    const filter = {};

    if (productId) filter.productId = productId;
    if (orderId) filter.orderId = orderId;
    if (rating) filter.rating = parseInt(rating);
    if (type) filter.type = type;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const userIds = users.map(user => user._id);

      if (userIds.length === 0) {
        return res.status(200).json([]);
      }

      filter.userId = { $in: userIds };
    }

    if (userId) {
      filter.userId = userId;
    }

    const reviews = await Review.find(filter)
      .populate('userId', 'name email profilePicture')
      .sort({ createdAt: -1 });

    const enhancedReviews = await Promise.all(
      reviews.map(async (review) => {
        if (!review.orderId) {
          return { ...review.toObject(), productName: null, productCategory: null };
        }

        const order = await Transaction.findById(review.orderId);

        if (!order) return { ...review.toObject(), productName: null, productCategory: null };

        const matchedItem = order.items.find(
          item => item._id && item._id.toString() === review.orderId.toString()
        );

        return {
          ...review.toObject(),
          productName: matchedItem?.name || null,
          productCategory: matchedItem?.category || null,
        };
      })
    );

    res.status(200).json(enhancedReviews);
  } catch (error) {
    console.error('Error fetching all reviews for admin:', error);
    res.status(500).json({ message: error.message });
  }
};


// Admin respond to a review
export const respondToReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.adminResponse = req.body.adminResponse || null;
    await review.save();

    res.status(200).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin delete review
export const adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.status(200).json({ message: 'Review deleted by admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
