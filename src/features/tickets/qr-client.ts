export const generateTicketQrDataUrl = async (token: string): Promise<string> => {
  const qrcode = await import("qrcode");
  return qrcode.toDataURL(token, {
    width: 168,
    margin: 1,
    errorCorrectionLevel: "M",
  });
};
