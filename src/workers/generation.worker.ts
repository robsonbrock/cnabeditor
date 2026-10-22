/// <reference lib="webworker" />
// Worker de geração de massa (research G7). Mesmo layout por import estático; sem rede.
import { febrabanCnab240 } from "../layouts/loader";
import { createGenerationRunner, type GenIn, type GenOut } from "./generation-runner";

const scope = self as unknown as DedicatedWorkerGlobalScope;

const runner = createGenerationRunner(febrabanCnab240, (msg: GenOut) => scope.postMessage(msg));

scope.onmessage = (e: MessageEvent<GenIn>) => runner.handle(e.data);
