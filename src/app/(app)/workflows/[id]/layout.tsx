import type { Viewport } from 'next';
import { DisableErrorOverlay } from '@/components/disable-error-overlay';

export const viewport: Viewport = {
  themeColor: "#1c1c1c",
};


export default function WorkflowEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-svh w-svw">
      <DisableErrorOverlay />
      {children}
    </div>
  );
}
