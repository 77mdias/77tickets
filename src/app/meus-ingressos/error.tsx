"use client";

import GlobalError from "@/app/error";

export default function MeusIngressosError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <GlobalError {...props} message="Não foi possível carregar seus ingressos. Tente novamente." />;
}
