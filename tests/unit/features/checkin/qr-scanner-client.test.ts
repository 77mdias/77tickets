import { describe, expect, test } from "vitest";

import {
  mapCameraError,
  parseQrResult,
} from "../../../../src/features/checkin/qr-scanner-client";

describe("mapCameraError", () => {
  test("returns permission denied message for NotAllowedError", () => {
    const error = Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" });
    expect(mapCameraError(error)).toBe(
      "Permissão negada. Use o campo de texto abaixo.",
    );
  });

  test("returns camera not found message for NotFoundError", () => {
    const error = Object.assign(new Error("NotFoundError"), { name: "NotFoundError" });
    expect(mapCameraError(error)).toBe(
      "Câmera não encontrada. Use o campo de texto abaixo.",
    );
  });

  test("returns generic message for unknown errors", () => {
    const error = Object.assign(new Error("SomethingElse"), { name: "SomethingElse" });
    expect(mapCameraError(error)).toBe(
      "Câmera indisponível. Use o campo de texto abaixo.",
    );
  });

  test("returns generic message for non-Error values", () => {
    expect(mapCameraError(null)).toBe(
      "Câmera indisponível. Use o campo de texto abaixo.",
    );
    expect(mapCameraError("random string")).toBe(
      "Câmera indisponível. Use o campo de texto abaixo.",
    );
  });
});

describe("parseQrResult", () => {
  test("returns the data string when jsQR finds a code", () => {
    const fakeResult = { data: "TICKET-UUID-001" };
    expect(parseQrResult(fakeResult)).toBe("TICKET-UUID-001");
  });

  test("returns null when jsQR returns null (no code found)", () => {
    expect(parseQrResult(null)).toBeNull();
  });

  test("returns null when data is empty", () => {
    expect(parseQrResult({ data: "" })).toBeNull();
  });
});
