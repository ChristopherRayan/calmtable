// Consistent section heading for major page blocks.
interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="space-y-3">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tableBrown/80">{eyebrow}</p>}
      <h2 className="font-heading text-3xl text-tableBrown sm:text-4xl">{title}</h2>
      {description && <p className="max-w-2xl text-sm leading-relaxed text-[#4B3A32] sm:text-base">{description}</p>}
    </div>
  );
}
