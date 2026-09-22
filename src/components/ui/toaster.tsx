"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  const renderDescription = (desc: any) => {
    if (desc == null) return null
    // Allow valid React elements or strings/numbers directly
    if (typeof desc === 'string' || typeof desc === 'number') return desc as any
    // If it's a valid React element, return as-is
    if (typeof desc === 'object' && (desc as any).$$typeof) return desc as any
    // Fallback: pretty-print objects/arrays so React can render them
    try {
      return <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(desc, null, 2)}</pre>
    } catch {
      return String(desc)
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description !== undefined && description !== null && (
                <ToastDescription>{renderDescription(description)}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
