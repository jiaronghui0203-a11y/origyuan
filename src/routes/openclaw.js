import express from "express";

export function createOpenClawRoutes(openclawAdapter) {
  const router = express.Router();

  router.get("/status", async (req, res) => {
    res.json(await openclawAdapter.getStatus());
  });

  router.post("/dispatch", async (req, res) => {
    res.json(await openclawAdapter.dispatch(req.body.taskName, req.body.payload));
  });

  return router;
}
