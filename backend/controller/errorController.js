export default (err,req,res,next)=>{
    err.statusCode=err.statusCode || 500;
    err.statuus= err.status || "error";

    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};