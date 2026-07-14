import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees and clear localStorage between tests so auth state does
// not leak from one test into the next.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
