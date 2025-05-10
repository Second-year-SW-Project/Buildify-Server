import buildModel from '../model/buildModel.js';
import mongoose from 'mongoose';

// Add Build. This handles post request to add a new build to the database
const addBuild = async (req, res) => {
  try {
    const buildData = req.body;//Extracts build data from request body
    
    // Log incoming data for debugging
    console.log('Received build data:', JSON.stringify(buildData, null, 2));
    
    // Validate required fields
    if (!buildData.name || !buildData.type || !buildData.image || !buildData.components || !buildData.totalPrice) {
      console.log('Missing required fields:', {
        name: !buildData.name,
        type: !buildData.type,
        image: !buildData.image,
        components: !buildData.components,
        totalPrice: !buildData.totalPrice
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields',
        missingFields: {
          name: !buildData.name,
          type: !buildData.type,
          image: !buildData.image,
          components: !buildData.components,
          totalPrice: !buildData.totalPrice
        }
      });
    }

    // Validate components array. The components are an array of objects
    if (!Array.isArray(buildData.components)) {
      console.log('Invalid components format:', buildData.components);
      return res.status(400).json({ 
        success: false, 
        message: 'Components must be an array' 
      });
    }

    // Validate each component
    const invalidComponents = buildData.components.filter(component => {
      const missingFields = [];
      if (!component.componentName) missingFields.push('componentName');
      if (!component.type) missingFields.push('type');
      if (!component.price) missingFields.push('price');
      if (!component.image) missingFields.push('image');
      if (!component._id) missingFields.push('_id');
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

    // Process components to handle duplicates
    const processedComponents = buildData.components.reduce((acc, component) => {
      try {
        // Find if this component already exists in the accumulator
        const existingComponent = acc.find(c => 
          c.componentName === component.componentName && 
          c.type === component.type && 
          c._id.toString() === component._id.toString()
        );

        if (existingComponent) {
          // If component exists, increment quantity
          existingComponent.quantity += 1;
          // Keep the original price per unit
          existingComponent.price = component.price;
        } else {
          // If component doesn't exist, add it with quantity 1
          acc.push({
            ...component,
            quantity: 1,
            price: component.price // Keep original price
          });
        }
      } catch (error) {
        console.error('Error processing component:', component, error);
      }
      return acc;
    }, []);

    // Calculate total price based on quantity and unit price
    const totalPrice = processedComponents.reduce((sum, component) => {
      return sum + (component.price * component.quantity);
    }, 0);

    // Update build data with processed components and total price
    const processedBuildData = {
      ...buildData,
      components: processedComponents,
      totalPrice: totalPrice
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

    const build = await buildModel.findById(id);//Finds the build by ID using the buildModel.findById method

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
    const { id } = req.params;//Extracts the build ID from the request parameters
    const updateData = req.body;//

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
    const { id } = req.params;//Extracts the build ID from the request parameters

    //Checks if the build ID is valid using the mongoose.Types.ObjectId.isValid method
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

export { addBuild, listBuilds, getBuildById, updateBuild, removeBuild };//Exports the functions to be used in routes