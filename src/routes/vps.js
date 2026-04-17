import express from "express";

export function createVpsRoutes(vpsAdapter) {
  const router = express.Router();

  router.post("/run", async (req, res) => {
    res.json(await vpsAdapter.mockRunCommand(req.body.command));
  });

  return router;
}
