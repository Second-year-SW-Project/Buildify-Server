import { Router } from "express";
import Review from '../model/ReviewModel.js'

const reviewrouter = Router();

// Add a review
reviewrouter.post("/submit", async (req, res) => {
    try {
      const { type, itemId, userId, rating, comment } = req.body;
      if (!type || !itemId || !userId || !rating || !comment) {
        return res.status(400).json({ error: "All fields are required" });
      }
      const review = new Review({ type, itemId, userId, rating, comment });
      await review.save();
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Get reviews for a specific item
reviewrouter.get("/:type/:itemId", async (req, res) => {
    try {
      const { type, itemId } = req.params;
      const reviews = await Review.find({ type, itemId }).populate("userId", "name");
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// Admin gets all reviews with optional filtering
reviewrouter.get('/admin', async (req, res) => {
    try {
        const { type, itemId, minRating, maxRating } = req.query;
        
        const query = {};

        if (type) query.type = type;
        if (itemId) query.itemID = itemId;
        if (minRating) query.rating = { $gte: Number(minRating) };
        if (maxRating) {
            query.rating = query.rating
                ? { ...query.rating, $lte: Number(maxRating) }
                : { $lte: Number(maxRating) };
        }

        const reviews = await Review.find(query)
            .populate("userID", "name email") // Use 'userID' instead of 'userId'
            .populate("itemID", "name description");
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Admin responds to a review
reviewrouter.post('/admin/respond/:reviewId', async (req, res) => {
    try {
        const { response } = req.body;
        const { reviewId } = req.params;

        if (!response) {
            return res.status(400).json({ error: "Response is required" });
        }

        const review = await Review.findById(reviewId)
            .populate("userID", "name email")
            .populate("itemID", "name description");

        if (!review) {
            return res.status(404).json({ error: "Review not found" });
        }

        review.adminResponse = response;
        await review.save();

        res.json({ message: "Admin response added successfully", review });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


  

  


export default reviewrouter;

