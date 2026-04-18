import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';

/**
 * Custom render function that wraps components with AuthProvider.
 * Use this for testing components that need authentication context.
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const Wrapper = ({ children }: { children: ReactElement }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
