import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mounts the auth callback routes (/api/auth/*) on the Convex HTTP endpoint.
auth.addHttpRoutes(http);

export default http;
