import express from "express";

export function createBrowserRoutes(browserAdapter) {
  const router = express.Router();

  router.get("/status", async (req, res) => {
    res.json(await browserAdapter.getBrowserStatus());
  });

  router.post("/open-profile", async (req, res) => {
    res.json(await browserAdapter.openProfile(req.body.profileId));
  });

  return router;
}
