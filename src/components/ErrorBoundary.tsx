import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createTranslator } from '@/i18n/translate';
import { usePreferences } from '@/stores/preferences';
import { Button, ErrorState } from '@/components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      const { t } = createTranslator(usePreferences.getState().locale);
      return (
        <div className="grid min-h-dvh place-items-center bg-canvas px-4">
          <ErrorState
            title={t('errors.boundaryTitle')}
            description={t('errors.boundaryHint')}
            action={
              <Button onClick={() => window.location.reload()}>{t('errors.reload')}</Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
