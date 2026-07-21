import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface ConfirmationOptions {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'primary' | 'danger';
}

export default function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((nextOptions: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setOptions(nextOptions);
  }), []);

  const settle = (confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  };

  return {
    confirm,
    confirmationDialog: (
      <ConfirmDialog
        open={Boolean(options)}
        title={options?.title || ''}
        description={options?.description || ''}
        confirmLabel={options?.confirmLabel || ''}
        cancelLabel={options?.cancelLabel || ''}
        tone={options?.tone}
        onConfirm={() => settle(true)}
        onClose={() => settle(false)}
      />
    ),
  };
}
