import { FastifyInstance } from "fastify";
import { knex } from "../database";
import { z } from "zod";
import { randomUUID } from "crypto";
import { checkSessionIdExists } from "../middlewares/checkSessionIdExists";

export async function mealsRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: [checkSessionIdExists] }, async (req, res) => {
    try {
      const createMealsSchema = z.object({
        name: z.string(),
        description: z.string(),
        is_on_diet: z.boolean(),
        date: z.coerce.date(),
      });

      const { name, description, is_on_diet, date } = createMealsSchema.parse(
        req.body,
      );

      await knex("meals").insert({
        id: randomUUID(),
        user_id: req.user?.id,
        name,
        description,
        is_on_diet,
        date: date.getTime(),
      });

      return res.status(201).send();
    } catch (error) {
      return res.send(error);
    }
  });

  app.get("/", { preHandler: [checkSessionIdExists] }, async (req, res) => {
    const meals = await knex("meals").where({ user_id: req.user?.id });

    return { meals };
  });

  app.get("/:id", { preHandler: [checkSessionIdExists] }, async (req, res) => {
    const getMealsParamsSchema = z.object({
      id: z.string().uuid(),
    });
    const { id } = getMealsParamsSchema.parse(req.params);

    try {
      const meal = await knex("meals").where({ id }).first();
      if (!meal) return res.status(404).send({ message: "Not Found!" });

      return { meal };
    } catch (error) {
      return res.status(500).send({ message: "Internal Server Error!" });
    }
  });

  app.patch(
    "/:id",
    { preHandler: [checkSessionIdExists] },
    async (req, res) => {
      const createMealsSchema = z.object({
        name: z.string().nullable(),
        description: z.string().nullable(),
        is_on_diet: z.boolean().nullable(),
        date: z.coerce.date().nullable(),
      });

      const { name, description, is_on_diet, date } = createMealsSchema.parse(
        req.body,
      );

      const getMealsParamsSchema = z.object({
        id: z.string().uuid(),
      });
      const { id } = getMealsParamsSchema.parse(req.params);

      try {
        const meal = await knex("meals").where({ id }).first();
        if (!meal) return res.status(404).send({ message: "Not Found!" });

        const updatedMeals = {
          name: name ?? meal.name,
          description: description ?? meal.description,
          date: date?.getTime() ?? meal.date,
          is_on_diet: is_on_diet ?? meal.is_on_diet,
        };
        await knex("meals").update(updatedMeals).where({ id });

        return res.status(204).send();
      } catch (error) {
        return res.status(500).send({ message: "Internal Server Error!" });
      }
    },
  );

  app.delete("/:id", async (req, res) => {
    const getMealsParamsSchema = z.object({
      id: z.string().uuid(),
    });
    const { id } = getMealsParamsSchema.parse(req.params);

    try {
      const mealDeleted = await knex("meals").del().where({ id });
      if (mealDeleted === 0)
        return res.status(400).send({
          message: "Não foi possível excluir o Produto, tente novamente!",
        });

      return res.status(200).send({ message: "Produto excluído com sucesso!" });
    } catch (error) {
      return res.status(500).send({ message: "Internal Server Error!" });
    }
  });

  app.get(
    "/metrics",
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const totalMealsOnDiet = await knex("meals")
        .where({ user_id: request.user?.id, is_on_diet: true })
        .count("id", { as: "total" })
        .first();

      const totalMealsOffDiet = await knex("meals")
        .where({ user_id: request.user?.id, is_on_diet: false })
        .count("id", { as: "total" })
        .first();

      const totalMeals = await knex("meals")
        .where({ user_id: request.user?.id })
        .orderBy("date", "desc");

      const { bestOnDietSequence } = totalMeals.reduce(
        (acc, meal) => {
          if (meal.is_on_diet) {
            acc.currentSequence += 1;
          } else {
            acc.currentSequence = 0;
          }

          if (acc.currentSequence > acc.bestOnDietSequence) {
            acc.bestOnDietSequence = acc.currentSequence;
          }

          return acc;
        },
        { bestOnDietSequence: 0, currentSequence: 0 },
      );

      return reply.send({
        totalMeals: totalMeals.length,
        totalMealsOnDiet: totalMealsOnDiet?.total,
        totalMealsOffDiet: totalMealsOffDiet?.total,
        bestOnDietSequence,
      });
    },
  );
}
