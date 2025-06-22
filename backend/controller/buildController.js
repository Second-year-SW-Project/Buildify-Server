import buildModel from '../model/buildModel.js';
import mongoose from 'mongoose';
import Product from '../model/productModel.js';

// Add Build. This handles post request to add a new build to the database
const addBuild = async (req, res) => {
  try {
    const buildData = req.body; // Extracts build data from request body
    
    // Log incoming data for debugging
    console.log('Received build data:', JSON.stringify(buildData, null, 2));
    console.log('Data types:', {
      name: typeof buildData.name,
      componentsPrice: typeof buildData.componentsPrice,
      totalPrice: typeof buildData.totalPrice,
      components: Array.isArray(buildData.components) ? 'array' : typeof buildData.components
    });
    
    // Validate required fields - use strict checks for numbers (including 0)
    const hasPricing = (buildData.componentsPrice !== undefined && buildData.componentsPrice !== null) || 
                      (buildData.totalPrice !== undefined && buildData.totalPrice !== null);
    
    if (!buildData.name || !hasPricing) {
      console.log('Missing required fields:', {
        name: !buildData.name,
        componentsPrice: buildData.componentsPrice,
        totalPrice: buildData.totalPrice,
        hasPricing: hasPricing,
        nameValue: buildData.name,
        componentsPriceValue: buildData.componentsPrice,
        totalPriceValue: buildData.totalPrice
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields',
        missingFields: {
          name: !buildData.name,
          price: !hasPricing
        },
        receivedData: {
          name: buildData.name,
          componentsPrice: buildData.componentsPrice,
          totalPrice: buildData.totalPrice
        }
      });
    }

    // Use totalPrice if componentsPrice is not provided or is null/undefined
    if ((buildData.componentsPrice === undefined || buildData.componentsPrice === null) && 
        (buildData.totalPrice !== undefined && buildData.totalPrice !== null)) {
      buildData.componentsPrice = buildData.totalPrice;
    }

    // Validate components array. The components are an array of objects
    if (buildData.components && !Array.isArray(buildData.components)) {
      console.log('Invalid components format:', buildData.components);
      return res.status(400).json({ 
        success: false, 
        message: 'Components must be an array' 
      });
    }

    // Only validate components if they exist
    if (buildData.components && buildData.components.length > 0) {
      const invalidComponents = buildData.components.filter(component => {
        const missingFields = [];
        if (!component.componentId && !component._id) missingFields.push('componentId');
        if (!component.quantity) missingFields.push('quantity');
        return missingFields.length > 0;
      });

      if (invalidComponents.length > 0) {
        console.log('Invalid components found:', invalidComponents);
        return res.status(400).json({
          success: false,
          message: 'Invalid component data',
          invalidComponents
        });
      }
    }

    // Process components to handle duplicates
    const processedComponents = buildData.components ? buildData.components.reduce((acc, component) => {
      try {
        // Use _id if componentId is not available
        const componentId = component.componentId || component._id;
        
        // Find if this component already exists in the accumulator
        const existingComponent = acc.find(c => 
          c.componentId.toString() === componentId.toString()
        );

        if (existingComponent) {
          // If component exists, increment quantity
          existingComponent.quantity += component.quantity;
        } else {
          // If component doesn't exist, add it with quantity
          acc.push({
            componentId: componentId,
            quantity: component.quantity
          });
        }
      } catch (error) {
        console.error('Error processing component:', component, error);
      }
      return acc;
    }, []) : [];

    // Update build data with processed components
    const processedBuildData = {
      ...buildData,
      components: processedComponents
    };

    console.log('Processed build data:', JSON.stringify(processedBuildData, null, 2));

    try {
      // Create new build and save it to the database
      const newBuild = await buildModel.create(processedBuildData);
      console.log('Build created successfully:', newBuild);
      res.status(201).json({ success: true, message: 'Build added successfully', build: newBuild });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ 
        success: false, 
        message: 'Database error while saving build',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error in addBuild:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.name,
      stack: error.stack
    });
  }
};

// List Builds. This handles get request to get all builds from the database using the buildModel.find({}) method
const listBuilds = async (req, res) => {
  try {
    const builds = await buildModel.find({});
    res.json({ success: true, builds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Build by ID
const getBuildById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid build ID format' });
    }

    const build = await buildModel.findById(id); // Finds the build by ID using the buildModel.findById method

    if (!build) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }

    res.json({ success: true, build });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Build
const updateBuild = async (req, res) => {
  try {
    const { id } = req.params; // Extracts the build ID from the request parameters
    const updateData = req.body;

    const updatedBuild = await buildModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedBuild) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }

    res.json({ success: true, message: 'Build updated successfully', build: updatedBuild });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Build. Handles delete request to delete a build from the database using the buildModel.findByIdAndDelete method
const removeBuild = async (req, res) => {
  try {
    const { id } = req.params; // Extracts the build ID from the request parameters

    // Checks if the build ID is valid using the mongoose.Types.ObjectId.isValid method
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid build ID' });
    }

    const deletedBuild = await buildModel.findByIdAndDelete(id);
    if (!deletedBuild) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }

    res.json({ success: true, message: 'Build removed successfully', build: deletedBuild });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Builds by User ID
const getBuildsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Fetch builds for the user
    const builds = await buildModel.find({ userId }).sort({ createdAt: -1 });

    // For each build, populate the components array with product details
    const buildsWithComponentDetails = await Promise.all(
      builds.map(async (build) => {
        // For each component, fetch the product details
        const populatedComponents = await Promise.all(
          (build.components || []).map(async (comp) => {
            try {
              const product = await Product.findById(comp.componentId);
              if (product) {
                return {
                  type: product.type,
                  name: product.name,
                  quantity: comp.quantity,
                  componentId: comp.componentId,
                };
              } else {
                return {
                  type: 'Unknown',
                  name: 'Unknown',
                  quantity: comp.quantity,
                  componentId: comp.componentId,
                };
              }
            } catch (err) {
              return {
                type: 'Error',
                name: 'Error',
                quantity: comp.quantity,
                componentId: comp.componentId,
              };
            }
          })
        );
        // Return the build with populated components
        return {
          ...build.toObject(),
          components: populatedComponents,
        };
      })
    );

    res.json({ success: true, builds: buildsWithComponentDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a build by ID
const deleteBuild = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid build ID' });
    }
    const deleted = await buildModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }
    res.json({ success: true, message: 'Build deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle publish status of a build by ID
const togglePublishBuild = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid build ID' });
    }
    const build = await buildModel.findById(id);
    if (!build) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }
    build.published = !build.published;
    await build.save();
    res.json({ success: true, published: build.published, message: `Build is now ${build.published ? 'published' : 'unpublished'}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export { addBuild, listBuilds, getBuildById, updateBuild, removeBuild, getBuildsByUser, deleteBuild, togglePublishBuild };