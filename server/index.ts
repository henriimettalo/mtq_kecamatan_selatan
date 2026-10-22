import { app } from "./app";
import { config, validateConfig } from "./config";
import { db } from "./db";
validateConfig();
const server = app.listen(config.port,"0.0.0.0",()=>console.log(`MTQ berjalan pada port ${config.port}`));
for (const signal of ["SIGTERM","SIGINT"]) process.on(signal,()=>{
  server.close(async()=>{await db.$disconnect();process.exit(0);});
  setTimeout(()=>process.exit(1),10000).unref();
});
