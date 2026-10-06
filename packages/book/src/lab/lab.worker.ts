import { createLabHost, type LabEvent, type LabRequest } from '@sicp/lab';

/** The slice of the worker global this file uses, typed for our protocol. */
interface LabWorkerScope {
  postMessage(event: LabEvent): void;
  onmessage: ((event: { data: LabRequest }) => void) | null;
}

const scope = self as unknown as LabWorkerScope;
const host = createLabHost({ post: (event) => scope.postMessage(event) });
scope.onmessage = (event) => host.handle(event.data);
