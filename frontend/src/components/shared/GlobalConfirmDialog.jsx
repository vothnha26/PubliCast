import React from 'react';
import { useConfirmStore } from '@/store/useConfirmStore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * GlobalConfirmDialog
 * Component xác nhận toàn cục sử dụng AlertDialog của Radix UI.
 * Đồng bộ trạng thái từ useConfirmStore.
 */
export function GlobalConfirmDialog() {
  const { 
    isOpen, 
    title, 
    description, 
    confirmText, 
    cancelText, 
    secondaryText, 
    variant, 
    onConfirm, 
    onSecondary, 
    onCancel 
  } = useConfirmStore();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm mt-2">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
          <AlertDialogPrimitive.Cancel asChild>
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
          </AlertDialogPrimitive.Cancel>
          {secondaryText && (
            <AlertDialogPrimitive.Action asChild>
              <Button
                onClick={onSecondary}
                variant="outline"
              >
                {secondaryText}
              </Button>
            </AlertDialogPrimitive.Action>
          )}
          <AlertDialogPrimitive.Action asChild>
            <Button 
              onClick={onConfirm}
              variant={variant === 'destructive' ? 'destructive' : 'default'}
            >
              {confirmText}
            </Button>
          </AlertDialogPrimitive.Action>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
