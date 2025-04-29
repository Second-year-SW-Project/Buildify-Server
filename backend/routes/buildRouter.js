import express from 'express';
import { addBuild, listBuilds, getBuildById, updateBuild, removeBuild } from '../controller/buildController.js';

const buildRouter = express.Router();

buildRouter.route('/builds')
    .post(addBuild)
    .get(listBuilds);

buildRouter.route('/builds/:id')
    .get(getBuildById)
    .put(updateBuild)
    .delete(removeBuild);

export default buildRouter; 