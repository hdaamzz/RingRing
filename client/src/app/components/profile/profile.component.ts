import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProfileService } from '../../core/services/profile/profile.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [CommonModule,RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  protected currentUser = this.authService.currentUser;
  protected ringNumber = signal<string | null>(null);
  protected isGenerating = signal(false);
  protected showCopiedMessage = signal(false);

  ngOnInit(): void {
    this.loadRingNumber();
  }

  private loadRingNumber(): void {
    const user = this.currentUser();
    if (user?.ringNumber) {
      this.ringNumber.set(user.ringNumber);
    }
  }

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
        this.showCopiedMessage.set(true);
        setTimeout(() => this.showCopiedMessage.set(false), 2000);
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
