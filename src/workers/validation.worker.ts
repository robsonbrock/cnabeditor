/// <reference lib="webworker" />
// Worker de validação do arquivo inteiro (R9). Mesmo layout por import estático; sem rede.
import { febrabanCnab240 } from "../layouts/loader";
import { createValidationRunner, type WorkerIn, type WorkerOut } from "./validation-runner";

const scope = self as unknown as DedicatedWorkerGlobalScope;

const runner = createValidationRunner(
  febrabanCnab240,
  (msg: WorkerOut) => scope.postMessage(msg),
  (fn) => setTimeout(fn, 0),
);

scope.onmessage = (e: MessageEvent<WorkerIn>) => runner.handle(e.data);
