import multer from "multer";

// Set up multer for file uploads
const storage = multer.diskStorage({
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    }
});

// Set up the destination for file uploads
const upload = multer({ storage })

export default upload;