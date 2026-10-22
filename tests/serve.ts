import { setupTestEnvironment } from "./test-environment";
setupTestEnvironment();
const {app}=await import("../server/app");
app.listen(33317,"127.0.0.1",()=>console.log("Server uji MTQ: http://localhost:33317"));
