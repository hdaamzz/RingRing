import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { Router, RouterLink } from "@angular/router";

@Component({
  selector: 'app-landing',
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  protected authService = inject(AuthService);
  protected route = inject(Router)

  protected isAuthenticated = this.authService.isAuthenticated;
  protected currentUser = this.authService.currentUser;
  
  protected displayName = computed(() => {
    const user = this.currentUser();
    return user?.name?.split(' ')[0] || 'User';
  });

  ngOnInit(): void {}

  googleLogin = () => this.authService.loginWithGoogle();
  
  handleLogout = () => this.authService.logout();
  toProfile() {
    this.route.navigate(['/profile'])
  }
}
