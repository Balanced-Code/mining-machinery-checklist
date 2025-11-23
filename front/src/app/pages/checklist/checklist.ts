import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ChecklistItem, ChecklistTemplate } from '@core/models/checklist.model';
import { AuthService } from '@core/services/auth.service';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-checklist',
  imports: [FormsModule, DragDropModule, MatIconModule, ConfirmDialog],
  templateUrl: './checklist.html',
  styleUrl: './checklist.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checklist {
  private readonly authService = inject(AuthService);

  // Estado
  protected readonly templates = signal<ChecklistTemplate[]>([]);
  protected readonly expandedTemplates = signal<Set<number>>(new Set());
  protected readonly searchQuery = signal('');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 5;

  // Estados de edición
  protected readonly editingTemplateId = signal<number | null>(null);
  protected readonly editingItemId = signal<number | null>(null);
  protected readonly editingTitleValue = signal('');
  protected readonly editingItemValue = signal('');

  // Estados de confirmación
  protected readonly showDeleteTemplateConfirm = signal(false);
  protected readonly showDeleteItemConfirm = signal(false);
  protected readonly templateToDelete = signal<ChecklistTemplate | undefined>(undefined);
  protected readonly itemToDelete = signal<
    | {
        templateId: number;
        item: ChecklistItem;
      }
    | undefined
  >(undefined);

  // Permisos
  protected readonly canEdit = computed(() => {
    return this.authService.hasRequiredLevel(3);
  });

  // Templates filtrados
  protected readonly filteredTemplates = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.templates();

    return this.templates().filter((template) => {
      // Buscar en el título del template
      if (template.titulo.toLowerCase().includes(query)) {
        return true;
      }

      // Buscar en los ítems del template
      return template.items.some((item) => item.descripcion.toLowerCase().includes(query));
    });
  });

  // Paginación
  protected readonly paginatedTemplates = computed(() => {
    const filtered = this.filteredTemplates();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return filtered.slice(start, end);
  });

  protected readonly totalPages = computed(() => {
    return Math.ceil(this.filteredTemplates().length / this.itemsPerPage);
  });

  protected readonly showingFrom = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage + 1;
    return Math.min(start, this.filteredTemplates().length);
  });

  protected readonly showingTo = computed(() => {
    const end = this.currentPage() * this.itemsPerPage;
    return Math.min(end, this.filteredTemplates().length);
  });

  constructor() {
    // Cargar datos mock (luego se reemplazará con llamadas al backend)
    this.loadMockData();
  }

  /**
   * Carga datos de ejemplo (mock)
   */
  private loadMockData(): void {
    const mockTemplates: ChecklistTemplate[] = [
      {
        id: 1,
        titulo: 'Checklist 1',
        items: [
          {
            id: 1,
            orden: 1,
            descripcion:
              'Niveles de fluidos (aceite, motor, refrigerante, hidráulico) son correctos.',
            checklistTemplateId: 1,
          },
          {
            id: 2,
            orden: 2,
            descripcion: 'Presión de neumáticos correcta.',
            checklistTemplateId: 1,
          },
          {
            id: 3,
            orden: 3,
            descripcion: 'Estado de luces y señalización.',
            checklistTemplateId: 1,
          },
        ],
      },
      {
        id: 2,
        titulo: 'Checklist 2',
        items: [
          {
            id: 4,
            orden: 1,
            descripcion:
              'Niveles de fluidos (aceite, motor, refrigerante, hidráulico) son correctos.',
            checklistTemplateId: 2,
          },
          {
            id: 5,
            orden: 2,
            descripcion: 'Sistema de frenos operativo.',
            checklistTemplateId: 2,
          },
          {
            id: 6,
            orden: 3,
            descripcion: 'Cinturones de seguridad en buen estado.',
            checklistTemplateId: 2,
          },
          {
            id: 7,
            orden: 4,
            descripcion: 'Espejos retrovisores ajustados.',
            checklistTemplateId: 2,
          },
        ],
      },
      {
        id: 3,
        titulo: 'Checklist 3',
        items: [
          {
            id: 8,
            orden: 1,
            descripcion: 'Inspección visual del motor.',
            checklistTemplateId: 3,
          },
          {
            id: 9,
            orden: 2,
            descripcion: 'Verificación de sistema eléctrico.',
            checklistTemplateId: 3,
          },
          {
            id: 10,
            orden: 3,
            descripcion: 'Estado de mangueras y conexiones.',
            checklistTemplateId: 3,
          },
        ],
      },
      {
        id: 4,
        titulo: 'Checklist 4',
        items: [
          {
            id: 11,
            orden: 1,
            descripcion:
              'Niveles de fluidos (aceite, motor, refrigerante, hidráulico) son correctos.',
            checklistTemplateId: 4,
          },
          {
            id: 12,
            orden: 2,
            descripcion: 'Revisión de batería y conexiones.',
            checklistTemplateId: 4,
          },
          {
            id: 13,
            orden: 3,
            descripcion: 'Estado de correas y tensores.',
            checklistTemplateId: 4,
          },
          {
            id: 14,
            orden: 4,
            descripcion: 'Funcionamiento de sistema de refrigeración.',
            checklistTemplateId: 4,
          },
          {
            id: 15,
            orden: 5,
            descripcion: 'Verificación de filtros de aire y combustible.',
            checklistTemplateId: 4,
          },
        ],
      },
      {
        id: 5,
        titulo: 'Checklist 5',
        items: [
          {
            id: 16,
            orden: 1,
            descripcion: 'Inspección de estructura y chasis.',
            checklistTemplateId: 5,
          },
          {
            id: 17,
            orden: 2,
            descripcion: 'Estado de suspensión y amortiguadores.',
            checklistTemplateId: 5,
          },
          {
            id: 18,
            orden: 3,
            descripcion: 'Verificación de sistema de escape.',
            checklistTemplateId: 5,
          },
        ],
      },
      {
        id: 6,
        titulo: 'Checklist 6',
        items: [
          {
            id: 19,
            orden: 1,
            descripcion: 'Revisión de documentación del vehículo.',
            checklistTemplateId: 6,
          },
          {
            id: 20,
            orden: 2,
            descripcion: 'Kit de emergencia completo.',
            checklistTemplateId: 6,
          },
        ],
      },
      {
        id: 7,
        titulo: 'Checklist 7',
        items: [
          {
            id: 21,
            orden: 1,
            descripcion: 'Verificación de sistema hidráulico.',
            checklistTemplateId: 7,
          },
        ],
      },
    ];

    this.templates.set(mockTemplates);
  }

  /**
   * Alterna el estado expandido/colapsado de un template
   */
  protected toggleTemplate(templateId: number): void {
    const expanded = this.expandedTemplates();
    const newExpanded = new Set(expanded);

    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }

    this.expandedTemplates.set(newExpanded);
  }

  /**
   * Verifica si un template está expandido
   */
  protected isExpanded(templateId: number): boolean {
    return this.expandedTemplates().has(templateId);
  }

  /**
   * Crea un nuevo template vacío
   */
  protected async createTemplate(): Promise<void> {
    if (!this.canEdit()) return;

    const newTemplate: ChecklistTemplate = {
      id: Date.now(), // Mock ID
      titulo: `Checklist ${this.templates().length + 1}`,
      items: [],
    };

    this.templates.update((templates) => [...templates, newTemplate]);
    this.expandedTemplates.update((expanded) => new Set([...expanded, newTemplate.id]));

    // Auto-editar el título
    this.startEditingTitle(newTemplate.id, newTemplate.titulo);
  }

  /**
   * Inicia la edición del título de un template
   */
  protected startEditingTitle(templateId: number, currentTitle: string): void {
    if (!this.canEdit()) return;

    this.editingTemplateId.set(templateId);
    this.editingTitleValue.set(currentTitle);
  }

  /**
   * Guarda el título editado
   */
  protected saveTitle(templateId: number): void {
    const newTitle = this.editingTitleValue().trim();

    if (!newTitle) {
      this.cancelEditingTitle();
      return;
    }

    this.templates.update((templates) =>
      templates.map((t) => (t.id === templateId ? { ...t, titulo: newTitle } : t))
    );

    this.cancelEditingTitle();
  }

  /**
   * Cancela la edición del título
   */
  protected cancelEditingTitle(): void {
    this.editingTemplateId.set(null);
    this.editingTitleValue.set('');
  }

  /**
   * Elimina un template completo
   */
  protected deleteTemplate(template: ChecklistTemplate): void {
    if (!this.canEdit()) return;

    this.templateToDelete.set(template);
    this.showDeleteTemplateConfirm.set(true);
  }

  /**
   * Confirmar eliminación de template
   */
  protected confirmDeleteTemplate(): void {
    const template = this.templateToDelete();
    if (!template) return;

    this.templates.update((templates) => templates.filter((t) => t.id !== template.id));
    this.expandedTemplates.update((expanded) => {
      const newExpanded = new Set(expanded);
      newExpanded.delete(template.id);
      return newExpanded;
    });

    this.showDeleteTemplateConfirm.set(false);
    this.templateToDelete.set(undefined);
  }

  /**
   * Cancelar eliminación de template
   */
  protected cancelDeleteTemplate(): void {
    this.showDeleteTemplateConfirm.set(false);
    this.templateToDelete.set(undefined);
  }

  /**
   * Agrega un nuevo ítem a un template
   */
  protected addItem(templateId: number): void {
    if (!this.canEdit()) return;

    const template = this.templates().find((t) => t.id === templateId);
    if (!template) return;

    const newItem: ChecklistItem = {
      id: Date.now(), // Mock ID
      orden: template.items.length + 1,
      descripcion: '',
      checklistTemplateId: templateId,
    };

    this.templates.update((templates) =>
      templates.map((t) => (t.id === templateId ? { ...t, items: [...t.items, newItem] } : t))
    );

    // Auto-editar el ítem
    this.startEditingItem(newItem.id, '');
  }

  /**
   * Inicia la edición de un ítem
   */
  protected startEditingItem(itemId: number, currentDescription: string): void {
    if (!this.canEdit()) return;

    this.editingItemId.set(itemId);
    this.editingItemValue.set(currentDescription);
  }

  /**
   * Guarda el ítem editado
   */
  protected saveItem(templateId: number, itemId: number): void {
    const newDescription = this.editingItemValue().trim();

    if (!newDescription) {
      // Si está vacío y es nuevo, eliminarlo
      const template = this.templates().find((t) => t.id === templateId);
      const item = template?.items.find((i) => i.id === itemId);

      if (item && !item.descripcion) {
        this.templates.update((templates) =>
          templates.map((t) =>
            t.id === templateId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t
          )
        );
      }

      this.cancelEditingItem();
      return;
    }

    this.templates.update((templates) =>
      templates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              items: t.items.map((i) =>
                i.id === itemId ? { ...i, descripcion: newDescription } : i
              ),
            }
          : t
      )
    );

    this.cancelEditingItem();
  }

  /**
   * Cancela la edición de un ítem
   */
  protected cancelEditingItem(): void {
    this.editingItemId.set(null);
    this.editingItemValue.set('');
  }

  /**
   * Elimina un ítem
   */
  protected deleteItem(templateId: number, item: ChecklistItem): void {
    if (!this.canEdit()) return;

    this.itemToDelete.set({ templateId, item });
    this.showDeleteItemConfirm.set(true);
  }

  /**
   * Confirmar eliminación de ítem
   */
  protected confirmDeleteItem(): void {
    const data = this.itemToDelete();
    if (!data) return;

    const { templateId, item } = data;

    this.templates.update((templates) =>
      templates.map((t) => {
        if (t.id === templateId) {
          const newItems = t.items
            .filter((i) => i.id !== item.id)
            .map((i, index) => ({ ...i, orden: index + 1 }));
          return { ...t, items: newItems };
        }
        return t;
      })
    );

    this.showDeleteItemConfirm.set(false);
    this.itemToDelete.set(undefined);
  }

  /**
   * Cancelar eliminación de ítem
   */
  protected cancelDeleteItem(): void {
    this.showDeleteItemConfirm.set(false);
    this.itemToDelete.set(undefined);
  }

  /**
   * Maneja el drop de drag & drop para reordenar ítems
   */
  protected onItemDrop(event: CdkDragDrop<ChecklistItem[]>, templateId: number): void {
    if (!this.canEdit()) return;

    this.templates.update((templates) =>
      templates.map((t) => {
        if (t.id === templateId) {
          const items = [...t.items];
          moveItemInArray(items, event.previousIndex, event.currentIndex);

          // Actualizar orden
          const reorderedItems = items.map((item, index) => ({
            ...item,
            orden: index + 1,
          }));

          return { ...t, items: reorderedItems };
        }
        return t;
      })
    );
  }

  /**
   * Actualiza la búsqueda
   */
  protected updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1); // Reset a la primera página
  }

  /**
   * Navega a la página anterior
   */
  protected previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  /**
   * Navega a la página siguiente
   */
  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  /**
   * Navega a una página específica
   */
  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
}
