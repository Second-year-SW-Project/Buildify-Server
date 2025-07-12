import express from 'express';//Importing express module for creating routes
import { protect } from "../middleware/authMiddleware.js"
import { isAdmin, isUser } from "../middleware/roleMiddleware.js";
import { addBuild, listBuilds, getBuildById, updateBuild, removeBuild, getBuildsByUser, deleteBuild, togglePublishBuild } from '../controller/buildController.js';//Importing the controller functions

const buildRouter = express.Router();//Creating a router object

buildRouter.route('/builds')//Defining the routes for the builds
    .post(addBuild)//Adding a new build
    .get(listBuilds);//Getting all builds

buildRouter.route('/builds/:id')//Defining the routes for the builds by ID
    .get(getBuildById)//Getting a build by ID
    .put(updateBuild)//Updating a build
    .delete(removeBuild);//Deleting a build

buildRouter.route('/builds/user/:userId')
    .get(getBuildsByUser);

// New routes for delete and publish toggle
buildRouter.route('/builds/delete/:id')
    .delete(deleteBuild);
buildRouter.route('/builds/publish/:id')
    .patch(togglePublishBuild);

export default buildRouter;//Exporting the router object
