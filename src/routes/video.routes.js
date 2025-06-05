import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  getCurrentUserVideos,
  getAllVideosByUserId,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

try {
  router
    .route("/")
    .get(getAllVideos)
    .post(
      verifyJWT,
      upload.fields([
        {
          name: "videoFile",
          maxCount: 1,
        },
        {
          name: "thumbnail",
          maxCount: 1,
        },
      ]),
      (req, res, next) => {
        console.log("req.body", req.body);
        console.log("req.files", req.files);
        console.log("req.headers", req.headers);

        next();
      },
      publishAVideo,
    );

  router.route("/get-user-videos/:userId").get(verifyJWT, getAllVideosByUserId);

  router.route("/get-user-videos").get(verifyJWT, getCurrentUserVideos);

  router
    .route("/:videoId")
    .get(verifyJWT, getVideoById)
    .delete(verifyJWT, deleteVideo)
    .patch(verifyJWT, upload.single("thumbnail"), updateVideo);

  router.route("/toggle-publish/:videoId").patch(togglePublishStatus);
} catch (error) {
  console.error("Error initializing video routes:", error);
}

export default router;
