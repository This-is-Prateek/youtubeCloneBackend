import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => { //working
    //TODO: build a healthcheck response that simply returns the OK status as json with a message
    try {
        return res
            .status(200)
            .json(
                new ApiResponse(200, "OK", "request processed successfully by the server")
            )
    } catch (error) {
        throw new ApiError(500, "server couldn't process the request")
    }
})

export {
    healthcheck
}
