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
                isDone && 'border-tableBrown bg-tableBrown text-white',
                isActive && 'border-tableBrown text-tableBrown',
                !isActive && !isDone && 'border-woodAccent text-tableBrown/70'
              )}
            >
              {stepNumber}
            </span>
            <span className={cn('text-sm', isActive ? 'text-tableBrown font-semibold' : 'text-tableBrown/80')}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
