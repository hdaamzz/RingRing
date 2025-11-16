import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ContactService } from '../../core/services/contact/contact.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { Contact, SearchUserResult } from '../../core/interfaces/contact';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../core/services/toast/toast.service';

@Component({
  selector: 'app-contacts',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css'
})
export class ContactsComponent implements OnInit {
  private contactService = inject(ContactService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  protected contacts = signal<Contact[]>([]);
  protected searchQuery = signal<string>('');
  protected searchResult = signal<SearchUserResult | null>(null);
  protected isSearching = signal<boolean>(false);
  protected isLoading = signal<boolean>(false);
  protected activeTab = signal<'all' | 'favorites' | 'recent'>('all');
  protected showAddModal = signal<boolean>(false);
  protected showDeleteModal = signal<boolean>(false);
  protected contactToDelete = signal<Contact | null>(null);

  protected currentUser = this.authService.currentUser;
  
  protected filteredContacts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allContacts = this.contacts();
    const tab = this.activeTab();

    let filtered = allContacts;

    if (tab === 'favorites') {
      filtered = allContacts.filter(c => c.isFavorite);
    } else if (tab === 'recent') {
      filtered = allContacts.filter(c => c.lastCallDate).sort((a, b) => 
        new Date(b.lastCallDate!).getTime() - new Date(a.lastCallDate!).getTime()
      );
    }

    if (query) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.ringNumber.includes(query) ||
        (c.nickname && c.nickname.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  protected favoriteContacts = computed(() => 
    this.contacts().filter(c => c.isFavorite)
  );

  ngOnInit(): void {
    this.loadContacts();
  }

  private loadContacts(): void {
    this.isLoading.set(true);
    this.contactService.getContacts().subscribe({
      next: (response) => {
        this.contacts.set(response.contacts);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load contacts:', error);
        this.toastService.error('Failed to load contacts');
        this.isLoading.set(false);
      }
    });
  }

  searchUser(): void {
    const ringNumber = this.searchQuery().trim();
    
    if (!ringNumber || !/^\d{4}-\d{4}$/.test(ringNumber)) {
      this.toastService.warning('Please enter a valid Ring Number (format: XXXX-XXXX)');
      return;
    }

    this.isSearching.set(true);
    this.searchResult.set(null);

    this.contactService.searchUser(ringNumber).subscribe({
      next: (response) => {
        this.searchResult.set(response.user);
        this.isSearching.set(false);
        this.toastService.success('User found!');
      },
      error: (error) => {
        console.error('User not found:', error);
        this.toastService.error('User not found with this Ring Number');
        this.isSearching.set(false);
      }
    });
  }

  addContact(ringNumber: string): void {
    this.contactService.addContact(ringNumber).subscribe({
      next: (response) => {
        this.contacts.update(contacts => [...contacts, response.contact]);
        this.searchResult.set(null);
        this.searchQuery.set('');
        this.showAddModal.set(false);
        this.toastService.success('Contact added successfully! 🎉');
      },
      error: (error) => {
        console.error('Failed to add contact:', error);
        this.toastService.error(error.error?.error || 'Failed to add contact');
      }
    });
  }

  toggleFavorite(contact: Contact): void {
    this.contactService.toggleFavorite(contact.id).subscribe({
      next: (response) => {
        this.contacts.update(contacts => 
          contacts.map(c => c.id === contact.id ? response.contact : c)
        );
        const message = response.contact.isFavorite 
          ? `${contact.name} added to favorites ⭐` 
          : `${contact.name} removed from favorites`;
        this.toastService.success(message);
      },
      error: (error) => {
        console.error('Failed to toggle favorite:', error);
        this.toastService.error('Failed to update favorite status');
      }
    });
  }

  // deleteContact(contact: Contact): void {
  //   if (!confirm(`Remove ${contact.name} from your contacts?`)) {
  //     return;
  //   }

  //   this.contactService.deleteContact(contact.id).subscribe({
  //     next: () => {
  //       this.contacts.update(contacts => 
  //         contacts.filter(c => c.id !== contact.id)
  //       );
  //       this.toastService.success(`${contact.name} removed from contacts`);
  //     },
  //     error: (error) => {
  //       console.error('Failed to delete contact:', error);
  //       this.toastService.error('Failed to remove contact');
  //     }
  //   });
  // }
  deleteContact(contact: Contact): void {
    this.contactToDelete.set(contact);
    this.showDeleteModal.set(true);
  }
  confirmDelete(): void {
    const contact = this.contactToDelete();
    if (!contact) return;

    this.contactService.deleteContact(contact.id).subscribe({
      next: () => {
        this.contacts.update(contacts => 
          contacts.filter(c => c.id !== contact.id)
        );
        this.toastService.success(`${contact.name} removed from contacts`);
        this.cancelDelete();
      },
      error: (error) => {
        console.error('Failed to delete contact:', error);
        this.toastService.error('Failed to remove contact');
        this.cancelDelete();
      }
    });
  }
  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.contactToDelete.set(null);
  }

  startCall(contact: Contact): void {
    console.log('Starting call with:', contact);
    this.toastService.info(`Calling ${contact.name}... 📞`);
  }

  openAddModal(): void {
    this.showAddModal.set(true);
    this.searchQuery.set('');
    this.searchResult.set(null);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.searchQuery.set('');
    this.searchResult.set(null);
  }

  setActiveTab(tab: 'all' | 'favorites' | 'recent'): void {
    this.activeTab.set(tab);
  }

  logout(): void {
    this.authService.logout();
  }
}