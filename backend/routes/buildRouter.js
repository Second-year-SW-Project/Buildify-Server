import express from 'express';//Importing express module for creating routes
import { addBuild, listBuilds, getBuildById, updateBuild, removeBuild } from '../controller/buildController.js';//Importing the controller functions

const buildRouter = express.Router();//Creating a router object

buildRouter.route('/builds')//Defining the routes for the builds
    .post(addBuild)//Adding a new build
    .get(listBuilds);//Getting all builds

buildRouter.route('/builds/:id')//Defining the routes for the builds by ID
    .get(getBuildById)//Getting a build by ID
    .put(updateBuild)//Updating a build
    .delete(removeBuild);//Deleting a build

export default buildRouter;//Exporting the router object
