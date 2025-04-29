import Review from '../model/ReviewModel.js';
import {Transaction} from '../model/TransactionModel.js'; // or your Order model

// @desc Create a review
// export const createReview = async (req, res) => {
//   try {
//     const { productId, orderId, rating, comment } = req.body;
//     const userId = req.user.id;

//     console.log("User from token:", req.user);


//     // Validate ObjectId formats
//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       return res.status(400).json({ message: "Invalid order ID format." });
//     }

//     // Fetch the order by ID
//     const order = await Transaction.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: "Order not found." });
//     }

//     // Ensure user_id exists in the order and matches the logged-in user
//     if (!order.user_id || order.user_id.toString() !== userId.toString()) {
//       return res.status(403).json({ message: "You have not purchased this product." });
//     }

//     // Check if the product exists in the order items
//     const hasProduct = order.items.some(item => item._id.toString() === productId.toString());
//     if (!hasProduct) {
//       return res.status(403).json({ message: "Product not found in your order." });
//     }

//     // Check if the user has already reviewed the product in this order
//     const existingReview = await Review.findOne({ productId, orderId, userId });
//     if (existingReview) {
//       return res.status(400).json({ message: "You have already reviewed this product in this order." });
//     }

//     // Create and save the new review
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
//     console.error("Error in creating review:", err); // More detailed error logging
//     res.status(500).json({ message: err.message });
//   }
// };


export const createReview = async (req, res) => {
  try {
    const { productId, orderId, userId, rating, comment } = req.body;

    // Check if the user has already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product." });
    }

    // Create and save the new review
    const review = new Review({
      productId,
      orderId,
      userId,
      rating,
      comment,
    });

    await review.save();
    res.status(201).json(review); // Return the created review
  } catch (err) {
    console.error("Error in creating review:", err);
    res.status(500).json({ message: "An error occurred while creating the review." });
  }
};

// @desc Get reviews for a product
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
      console.error('Error fetching reviews:', error);  // Log the error
      res.status(500).json({ message: error.message });
    }
  };
  

// @desc Get logged-in user's reviews
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.id }).populate('productId');
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update my review
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

// @desc Delete my review
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

// @desc Get all reviews (admin)

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


// @desc Admin respond to a review
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

// @desc Admin delete review
export const adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.status(200).json({ message: 'Review deleted by admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
