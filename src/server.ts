import { app } from "./app";
import { env } from "./env/index";

app
  .listen({
    host: "localhost",
    port: env.PORT,
  })
  .then(() => console.log("Http Server is Running"));
