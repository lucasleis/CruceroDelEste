import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees between tests so component state does not leak from
// one test into the next.
afterEach(() => {
  cleanup();
});
