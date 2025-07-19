import express from 'express';//Importing express module for creating routes
import { addGames, listGames, updateGames, removeGames, getGameById } from '../controller/gameController.js';//Importing the controller functions
import upload from '../middleware/multer.js';//Importing the multer middleware for handling file uploads

const gameRouter = express.Router();

gameRouter.route('/games')//Defining the routes for the games
    .post(upload.single('image'), addGames)//Adding a new game
    .get(listGames);//Getting all games

gameRouter.route('/games/:id')//Defining the routes for the games by ID 
    .get(getGameById)  // Now this should work
    .put(upload.single('image'), updateGames)//Updating a game. Use multer to handle the image upload
    .delete(removeGames);//Deleting a game

export default gameRouter;//Exporting the router object
