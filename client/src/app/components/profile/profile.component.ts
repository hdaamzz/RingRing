import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProfileService } from '../../core/services/profile/profile.service';
import { Router, RouterLink } from '@angular/router';
import { ContactService } from '../../core/services/contact/contact.service';
import { ToastService } from '../../core/services/toast/toast.service';
import { Contact } from '../../core/interfaces/contact';
import { FormsModule } from '@angular/forms';
import { WebrtcService } from '../../core/services/webrtc/webrtc.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule,RouterLink,FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private webrtcService = inject(WebrtcService);
  private contactService = inject(ContactService);
  private toastService = inject(ToastService);
  private router = inject(Router);


  protected currentUser = this.authService.currentUser;
  protected ringNumber = signal<string | null>(null);
  protected isGenerating = signal(false);
  protected showCopiedMessage = signal(false);
  protected showCallModal = signal<boolean>(false);
  protected callSearchQuery = signal<string>('');
  protected contacts = signal<Contact[]>([]);

  ngOnInit(): void {
    this.loadRingNumber();
    this.loadContacts();
  }

  private loadRingNumber(): void {
    const user = this.currentUser();
    if (user?.ringNumber) {
      this.ringNumber.set(user.ringNumber);
    }
  }
  private loadContacts(): void {
    this.contactService.getContacts().subscribe({
      next: (response) => {
        this.contacts.set(response.contacts);
      },
      error: (error) => {
        console.error('Failed to load contacts:', error);
      }
    });
  }

  protected filteredCallContacts = computed(() => {
    const query = this.callSearchQuery().toLowerCase();
    const allContacts = this.contacts();

    if (!query) return allContacts;

    return allContacts.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.ringNumber.includes(query) ||
      (c.nickname && c.nickname.toLowerCase().includes(query))
    );
  });

  generateRingNumber(): void {
    this.isGenerating.set(true);

    this.profileService.assignRingNumber().subscribe({
      next: (response) => {
        this.ringNumber.set(response.ringNumber);
        this.isGenerating.set(false);
        const user = this.currentUser();
        if (user) {
          this.authService.updateUser({ ...user, ringNumber: response.ringNumber });
        }
      },
      error: (error) => {
        console.error('Failed to generate Ring Number:', error);
        this.isGenerating.set(false);
        alert('Failed to generate Ring Number. Please try again.');
      }
    });
  }

  copyRingNumber(): void {
    const number = this.ringNumber();
    if (number) {
      navigator.clipboard.writeText(number).then(() => {
        this.toastService.success(`Ring Number copied! ${number} `); 
        this.showCopiedMessage.set(true);
        setTimeout(() => this.showCopiedMessage.set(false), 2000);
      }).catch(() => {
        this.toastService.error('Failed to copy Ring Number'); 
      });
    }
  }

  async initiateCall(contact: Contact): Promise<void> {

    const user = this.currentUser();
    if (!user) {
      this.toastService.error('User not authenticated');
      return;
    }

    this.closeCallModal();

    try {
      const receiverEmail = contact.email;

      await this.webrtcService.initiateCall(
        receiverEmail,   
        contact.name,
        contact.picture,
        user.email,
        user.name,
        user.picture,
        'video'
      );

      this.router.navigate(['/call']);
      this.toastService.info(`Calling ${contact.name}... 📞`);
    } catch (error) {
      console.error('Failed to initiate call:', error);
      this.toastService.error('Failed to start call. Please check camera/microphone permissions.');
    }
}


  openCallModal(): void {
    this.showCallModal.set(true);
    this.callSearchQuery.set('');
  }

  closeCallModal(): void {
    this.showCallModal.set(false);
    this.callSearchQuery.set('');
  }

  logout(): void {
    this.authService.logout();
  }
}
