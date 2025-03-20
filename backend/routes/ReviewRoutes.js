import { Router } from "express";
import Review from '../model/ReviewModel.js'

const reviewrouter = Router();

// Add a review
reviewrouter.post("/reviews/submit", async (req, res) => {
    try {
      const { type, itemId, userId, rating, comment } = req.body;
      const review = new Review({ type, itemId, userId, rating, comment });
      await review.save();
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Get reviews for a specific item
reviewrouter.get("/reviews/:type/:itemId", async (req, res) => {
    try {
      const { type, itemId } = req.params;
      const reviews = await Review.find({ type, itemId }).populate("userId", "name");
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

export default reviewrouter;

