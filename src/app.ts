import fastify from "fastify";
import { knex } from "./database";
import cookie from "@fastify/cookie";
import { usersRoutes } from "./routes/usersRoutes";
import { mealsRoutes } from "./routes/mealsRoutes";

export const app = fastify();
app.register(cookie);
app.register(usersRoutes, { prefix: "users" });
app.register(mealsRoutes, { prefix: "meals" });
app.get("/", async (req, res) => {
  const tables = await knex("sqlite_schema").select("*");
  return res.send(tables);
});
