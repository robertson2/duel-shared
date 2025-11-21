import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}

