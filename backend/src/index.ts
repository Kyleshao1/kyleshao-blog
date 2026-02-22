import { env } from "./env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API running on :${env.PORT}`);
});
