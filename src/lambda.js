import serverlessExpress from '@codegenie/serverless-express';
import { app } from './app.js';
import connectDB from './db/index.js';

let server;

async function init() {
  console.log("🔌 Lambda init triggered");
  try {
    await connectDB();
    console.log("✅ Connected to DB");
    server = serverlessExpress({ app });
  } catch (error) {
    console.error("❌ Error during initialization:", error);
    throw error; // Re-throw to let Lambda fail fast if DB connection fails
  }
}

let initPromise;

export const handler = async (event, context) => {
  try {
    if (!server) {
      if (!initPromise) {
        initPromise = init();
      }
      await initPromise;
    }

    console.log("📨 Lambda handler invoked", event.rawPath);

    return await server(event, context); // Ensure this is awaited
  } catch (err) {
    console.error("🔥 Unhandled Lambda error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: err.message || "Unknown error",
      }),
    };
  }
};
