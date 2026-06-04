import { app } from "../server";

// Disable automatic body parsing on Vercel so that our Express app natively handles the raw stream
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;




