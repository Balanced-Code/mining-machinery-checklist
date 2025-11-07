import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'confirm-dialog-host',
  },
})
export class ConfirmDialog {
  // Inputs
  title = input<string>('Confirmar acción');
  message = input.required<string>();
  confirmText = input<string>('Confirmar');
  cancelText = input<string>('Cancelar');
  type = input<'warning' | 'danger' | 'info'>('warning');

  // Outputs
  onConfirm = output<void>();
  onCancel = output<void>();

  protected confirm(): void {
    this.onConfirm.emit();
  }

  protected cancel(): void {
    this.onCancel.emit();
  }
}
