import express from 'express';
import { addGames, listGames, updateGames, removeGames } from '../controller/gameController.js';
import upload from '../middleware/multer.js';

const gameRouter = express.Router();

gameRouter.route('/games')
    .post(upload.single('image'), addGames)
    .get(listGames);

gameRouter.route('/games/:id')
    .put(upload.single('image'), updateGames)
    .delete(removeGames);

export default gameRouter;
