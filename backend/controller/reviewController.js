import Review from '../model/ReviewModel.js';
import {Transaction} from '../model/TransactionModel.js'; 
import Product from "../model/productModel.js";
import mongoose from "mongoose";

export const createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;
    const userId = req.user.id;  

    console.log("Logged in user id:", userId); // Debug log

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format." });
    }

    // Fetch order
    const order = await Transaction.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Check if order belongs to this user
    if (!order.user_id || order.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You have not purchased this product." });
    }

    // Check if product is in order items
    const hasProduct = order.items.some(item => item._id.toString() === productId.toString());
    if (!hasProduct) {
      return res.status(403).json({ message: "Product not found in your order." });
    }

    // Check for existing review (for this product, order, and user)
    const existingReview = await Review.findOne({ productId, orderId, userId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product in this order." });
    }

    // Save new review
    const review = new Review({
      productId,
      orderId,
      userId,
      rating,
      comment,
    });

    await review.save();
    res.status(201).json(review);

  } catch (err) {
    console.error("Error in creating review:", err);
    res.status(500).json({ message: "An error occurred while creating the review." });
  }
};
// export const createReview = async (req, res) => {
//   try {
//     const { productId, orderId, rating, comment } = req.body;
//     const userId = req.user.id;

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
  

// Get logged-in user's reviews
export const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch transactions for user
    const transactions = await Transaction.find({ user_id: userId });

    // Get all product IDs from transactions
    const purchasedProductIds = transactions.flatMap((tx) =>
      tx.items.map((item) => item._id)
    );

    // Fetch all reviews by user
    const reviews = await Review.find({ userId: userId });

    // Fetch product details for purchased products
    const products = await Product.find({
      _id: { $in: purchasedProductIds },
    }).select("name price img_urls");

    // Combine: mark reviewed status
    const result = products.map((product) => {
      const review = reviews.find(
        (r) => r.productId === product._id.toString()
      );
      return {
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

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


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

export const getAllReviewsAdmin = async (req, res) => {
  try {
    const { productId, rating, userId } = req.query;
    const filter = {};

    if (productId) filter.productId = productId;
    if (rating) filter.rating = rating;
    if (userId) filter.userId = userId;

    // Step 1: Get all reviews with filters
    const reviews = await Review.find(filter)
      .populate('userId', 'name email profilePicture')
      .sort({ createdAt: -1 });

    // Step 2: For each review, fetch order -> find item -> extract name/category
    const enhancedReviews = await Promise.all(
      reviews.map(async (review) => {
        const order = await Transaction.findById(review.orderId);

        if (!order) return { ...review.toObject(), productName: null, productCategory: null };

        const matchedItem = order.items.find(
          item => item._id.toString() === review.productId.toString()
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
