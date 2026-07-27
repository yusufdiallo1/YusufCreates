import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";

interface HeroProps {
  title: string;
  subtitle?: string;
}

export function Hero({ title, subtitle }: HeroProps) {
  return (
    <FadeIn className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-4 max-w-xl text-lg opacity-70">{subtitle}</p>
      ) : null}
      <Button className="mt-8">Get started</Button>
    </FadeIn>
  );
}
