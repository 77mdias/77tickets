"use client";

import GlobalError from "@/app/error";

export default function EventDetailError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <GlobalError {...props} message="Não foi possível carregar este evento. Tente novamente." />;
}
