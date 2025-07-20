import { Router } from 'express';
import { healthcheck } from "../controllers/healthcheck.controller.js"

const router = Router();

router.route('/').get((req, res) => {
    console.log("✅ /api/v1/healthcheck route hit");
    healthcheck(req, res);
});

export default router