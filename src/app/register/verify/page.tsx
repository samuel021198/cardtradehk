import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

export default function RegisterVerifyPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
