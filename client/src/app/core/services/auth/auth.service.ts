import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase.config';
import { UserProfile, LoginResponse } from '../../interfaces/user';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private userSignal = signal<UserProfile | null>(null);
  private tokenSignal = signal<string | null>(null);

  public currentUser = this.userSignal.asReadonly();
  public isAuthenticated = computed(() => this.currentUser() !== null);
  private api=environment.api_url

  constructor() {
    this.loadFromStorage(); 
    this.setupAuthStateListener();
  }

  private loadFromStorage(): void {
    const storedUser = sessionStorage.getItem('currentUser');
    const storedToken = sessionStorage.getItem('authToken');

    if (storedUser && storedToken) {
      try {
        const user: UserProfile = JSON.parse(storedUser);
        this.userSignal.set(user);
        this.tokenSignal.set(storedToken);
      } catch (error) {
        console.error('Failed to parse stored data', error);
        this.clearUser();
      }
    }
  }

  private setupAuthStateListener(): void {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        this.clearUser();
      }
    });
  }

  private setUser(user: UserProfile, token: string): void {
    this.userSignal.set(user);
    this.tokenSignal.set(token);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    sessionStorage.setItem('authToken', token);
  }

  private clearUser(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  updateUser(user: UserProfile): void {
    this.userSignal.set(user);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }

  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      this.http
        .post<LoginResponse>( 
          `${this.api}/api/auth/google`,
          { idToken },
          { withCredentials: true }
        )
        .subscribe({
          next: (res) => {
            if (res.user.picture && res.user.picture.startsWith('/uploads')) {
              res.user.picture = `${environment.api_url}${res.user.picture}`;
            }
            console.log('Login successful:', res.user,res.token);
            this.setUser(res.user, res.token);
            this.router.navigate(['/']);
          },
          error: (err) => {
            console.error('Backend login failed', err);
          }
        });
    } catch (error) {
      console.error('Google popup failed', error);
    }
  }

  logout() {
    signOut(auth).then(() => {
      this.http
        .post(`${this.api}/api/auth/logout`, {}, { withCredentials: true })
        .subscribe({
          next: () => {
            this.clearUser();
            this.router.navigate(['/']);
          },
          error: (err) => {
            console.error('Logout failed', err);
            this.clearUser();
            this.router.navigate(['/']);
          }
        });
    });
  }

  getUserPicture(): string | undefined {
    return this.currentUser()?.picture;
  }

  getUserName(): string | undefined {
    return this.currentUser()?.name;
  }

  getUserEmail(): string | undefined {
    return this.currentUser()?.email;
  }
}
