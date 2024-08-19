import { FastifyInstance } from "fastify";
import { knex } from "../database";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function usersRoutes(app: FastifyInstance) {
  app.get("/", async (req, res) => {
    const { sessionId } = req.cookies;

    if (!sessionId)
      return res.status(400).send({ message: "Unidentified user! " });

    const user = await knex("users").where({ session_id: sessionId }).first();

    if (!user) return res.status(400).send({ message: "Unidentified user! " });

    const meals = await knex("meals").where({ user_id: user.id });

    return { user, meals };
  });

  app.post("/", async (req, res) => {
    try {
      const createUsersSchema = z.object({
        name: z.string(),
        email: z.string(),
      });

      const { name, email } = createUsersSchema.parse(req.body);

      let sessionId = req.cookies.sessionId;

      if (!sessionId) {
        sessionId = randomUUID();
        res.cookie("sessionId", sessionId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }

      const userByEmail = await knex("users").where({ email }).first();

      if (userByEmail)
        return res.status(400).send({ message: "User already exists" });

      await knex("users").insert({
        id: randomUUID(),
        name,
        email,
        session_id: sessionId,
      });

      return res.status(201).send();
    } catch (error) {
      return res.send(error);
    }
  });
}
