/// <reference lib="webworker" />
/**
 * The engine's Web Worker: it holds the catalog and the one `Rng`, and exposes the facade over
 * Comlink. Catalog creation, `evaluate` and `combatantOptions` run here, off the main thread.
 */

import { expose } from "comlink";
import { fetchFromServer } from "./content";
import { createInProcessFacade } from "./facade";

expose(createInProcessFacade({ fetchFile: fetchFromServer(import.meta.env.BASE_URL) }));
