const asyncHandler = (fn) => async (req, res, next) => {  //handles async request handlers
    try {
        await fn(req, res, next)
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })
    }
}

export {asyncHandler};