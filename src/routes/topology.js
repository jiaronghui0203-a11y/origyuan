import express from "express";

export function createTopologyRoutes(controlPlaneService) {
  const router = express.Router();

  router.get("/status", async (req, res) => {
    res.json(await controlPlaneService.getTopologyStatus());
  });

  return router;
}
