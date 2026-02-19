import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth (Passport)
  setupAuth(app);

  // === READINGS ===
  app.get(api.readings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const readings = await storage.getReadings(req.user!.id);
    res.json(readings);
  });

  app.post(api.readings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { juzNumber, isCompleted } = api.readings.update.input.parse(req.body);
      const updated = await storage.updateReading(req.user!.id, juzNumber, isCompleted);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === FINISH KHATMAH ===
  app.post("/api/khatmah/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const readings = await storage.getReadings(req.user!.id);
    const completedCount = readings.filter(r => r.isCompleted).length;

    if (completedCount < 30) {
      return res.status(400).json({ message: "You must complete all 30 parts first." });
    }

    await storage.completeKhatmah(req.user!.id);
    res.json({ message: "Khatmah completed! Mabrouk!" });
  });

  // === LEADERBOARD ===
  app.get(api.leaderboard.list.path, async (req, res) => {
    const leaderboard = await storage.getLeaderboard();
    res.json(leaderboard);
  });

  // No seeding — database stays clean
  console.log("Database ready. No default users created.");

  return httpServer;
}