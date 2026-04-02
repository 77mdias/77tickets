"use client";

import GlobalError from "@/app/error";

export default function CheckoutError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <GlobalError {...props} message="Erro no checkout. Tente novamente ou volte ao início." />;
}
