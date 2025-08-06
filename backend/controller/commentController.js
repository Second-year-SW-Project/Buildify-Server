import Comment from "../model/CommentModel.js";
import User from "../model/userModel.js";
import Product from "../model/productModel.js";

// @desc Add a comment to a product
export const addProductComment = async (req, res) => {
    const { comment } = req.body;
    const { productId } = req.params;
    console.log("User ID from token:", req.user);  // Log the entire user object
    const userId = req.user.id;
    console.log(userId);
  
    try {
      const newComment = new Comment({
        productId,
        userId,
        comment
      });
  
      await newComment.save();
  
      res.status(201).json(newComment);  // Respond with the created comment
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // @desc Update a comment for a product
  export const updateProductComment = async (req, res) => {
    const { comment } = req.body;
    const { commentId } = req.params;
    console.log("User ID from token:", req.user);  // Log the entire user object
    const userId = req.user.id;
    console.log(userId);
  
    try {
      const existingComment = await Comment.findById(commentId);
  
      if (!existingComment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
  
      if (existingComment.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'You are not authorized to update this comment' });
      }
  
      existingComment.comment = comment;
      await existingComment.save();
  
      res.status(200).json(existingComment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // @desc Delete a comment for a product
  export const deleteProductComment = async (req, res) => {
    const { commentId } = req.params;
    console.log("User ID from token:", req.user);  // Log the entire user object
    const userId = req.user.id;
    console.log(userId);
  
    try {
      const comment = await Comment.findById(commentId);
  
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
  
      if (comment.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'You are not authorized to delete this comment' });
      }
  
      await comment.deleteOne();

      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  
  //Admin side
  // @desc Get all comments for a product (Admin only)
export const getAllProductComments = async (req, res) => {
    const { productId } = req.params;
  
    try {
      const comments = await Comment.find()
        .populate('userId', 'name email profilePicture')
        .populate('productId', 'name type img_urls') // product name & category
        .sort({ createdAt: -1 });
  
      if (!comments || comments.length === 0) {
        return res.status(404).json({ message: 'No comments found for this product.' });
      }
  
      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // @desc Admin response to a comment
  export const respondToComment = async (req, res) => {
    const { commentId } = req.params;
  
    try {
      const comment = await Comment.findById(commentId);
  
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
  
      comment.adminResponse = req.body.adminResponse || null;
      await comment.save();
  
      res.status(200).json(comment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // @desc Admin delete a comment
  export const deleteAdminComment = async (req, res) => {
    const { commentId } = req.params;
  
    try {
      const comment = await Comment.findById(commentId);
  
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
  
      
      await comment.deleteOne();
      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  // @desc Safely post a comment to a product (uses req.user, validates input)
export const postProductCommentSafe = async (req, res) => {
  const { comment } = req.body;
  const { productId } = req.params;
  // Remove authentication check; allow anyone to comment
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return res.status(400).json({ message: "Comment is required" });
  }
  try {
    const newComment = new Comment({
      productId,
      userId: req.user && req.user.id ? req.user.id : undefined, // userId is optional
      comment: comment.trim(),
    });
    await newComment.save();
    // Optionally populate userId for immediate frontend display
    if (newComment.userId) {
      await newComment.populate('userId', 'name');
    }
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

  // @desc Get comments for a specific product (public)
export const getProductCommentsForProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const comments = await Comment.find({ productId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
  