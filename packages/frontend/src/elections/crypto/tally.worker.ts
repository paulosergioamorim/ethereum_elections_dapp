import { serveInWorker } from "@/lib/worker";
import { decryptBallots } from "./open-ballots";

serveInWorker(decryptBallots);
