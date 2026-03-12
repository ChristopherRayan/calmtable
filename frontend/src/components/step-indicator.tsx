// Multi-step progress indicator for reservation and checkout flows.
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center gap-3" aria-label="Progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                isDone && 'border-tableBrown bg-tableBrown text-white dark:border-white/30 dark:bg-white/10 dark:text-white',
                isActive && 'border-tableBrown text-tableBrown dark:border-white/30 dark:text-white',
                !isActive && !isDone && 'border-woodAccent text-tableBrown/70 dark:border-white/20 dark:text-white/60'
              )}
            >
              {stepNumber}
            </span>
            <span className={cn('text-sm', isActive ? 'text-tableBrown font-semibold dark:text-white' : 'text-tableBrown/80 dark:text-white/60')}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
