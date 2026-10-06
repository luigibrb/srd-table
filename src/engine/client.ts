/**
 * The app's handle on the engine: the facade running in a Web Worker, reached over Comlink.
 * Store actions and query hooks call `engine()`; tests install the in-process facade with
 * `setEngine`.
 */

import { type Remote, wrap } from "comlink";
import type { EngineFacade } from "./facade";

let instance: EngineFacade | Remote<EngineFacade> | null = null;

export function engine(): EngineFacade {
  instance ??= wrap<EngineFacade>(
    new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "engine" }),
  );
  // A Comlink proxy has the same async methods: every facade method already returns a Promise.
  return instance as EngineFacade;
}

/** Use another implementation (the in-process facade in tests). */
export function setEngine(facade: EngineFacade): void {
  instance = facade;
}
