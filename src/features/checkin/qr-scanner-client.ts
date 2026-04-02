export const mapCameraError = (error: unknown): string => {
  if (error instanceof Error || (typeof error === "object" && error !== null && "name" in error)) {
    const named = error as { name: string };
    if (named.name === "NotAllowedError") {
      return "Permissão negada. Use o campo de texto abaixo.";
    }
    if (named.name === "NotFoundError") {
      return "Câmera não encontrada. Use o campo de texto abaixo.";
    }
  }
  return "Câmera indisponível. Use o campo de texto abaixo.";
};

export const parseQrResult = (result: { data: string } | null): string | null => {
  if (!result || !result.data) {
    return null;
  }
  return result.data;
};
