import express from 'express';//Importing express module for creating routes
import { addBuild, listBuilds, getBuildById, updateBuild, removeBuild, getBuildsByUser, deleteBuild, togglePublishBuild } from '../controller/buildController.js';//Importing the controller functions
import protect from '../middleware/authMiddleware.js'; // Import authentication middleware

const buildRouter = express.Router();//Creating a router object

buildRouter.route('/builds')//Defining the routes for the builds
    .post(protect, addBuild)//Adding a new build - requires authentication
    .get(listBuilds);//Getting all builds - public access for published builds

buildRouter.route('/builds/:id')//Defining the routes for the builds by ID
    .get(getBuildById)//Getting a build by ID - public access
    .put(protect, updateBuild)//Updating a build - requires authentication
    .delete(protect, removeBuild);//Deleting a build - requires authentication

buildRouter.route('/builds/user/:userId')
    .get(protect, getBuildsByUser); // User-specific builds - requires authentication

// New routes for delete and publish toggle
buildRouter.route('/builds/delete/:id')
    .delete(protect, deleteBuild); // Requires authentication
buildRouter.route('/builds/publish/:id')
    .patch(protect, togglePublishBuild); // Requires authentication

export default buildRouter;//Exporting the router object
