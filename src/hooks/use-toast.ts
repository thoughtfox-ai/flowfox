/**
 * Toast hook using sonner
 */

import { toast as sonnerToast } from 'sonner'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = (props: ToastProps) => {
    const { title, description, variant } = props

    if (variant === 'destructive') {
      sonnerToast.error(title, {
        description,
      })
    } else {
      sonnerToast.success(title, {
        description,
      })
    }
  }

  return { toast }
}
