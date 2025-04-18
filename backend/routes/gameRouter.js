import express from 'express';
import { addGames, listGames, updateGames, removeGames, getGameById } from '../controller/gameController.js'; // Update this line
import upload from '../middleware/multer.js';

const gameRouter = express.Router();

gameRouter.route('/games').post(upload.single('image'), addGames)
    .get(listGames);

gameRouter.route('/games/:id')
    .get(getGameById)  // Now this should work
    .put(upload.single('image'), updateGames)
    .delete(removeGames);

export default gameRouter;