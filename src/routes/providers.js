import express from "express";

export function createProviderRoutes(controlPlaneService) {
  const router = express.Router();

  router.get("/status", async (req, res) => {
    res.json(await controlPlaneService.getProvidersStatus());
  });

  router.get("/models", async (req, res) => {
    res.json(await controlPlaneService.getApprovedModels());
  });

  return router;
}
