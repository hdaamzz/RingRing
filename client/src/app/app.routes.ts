import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authGuard } from './core/guard/auth/auth.guard';

export const routes: Routes = [
    {
        path:'',
        component:LandingComponent
    },
    { 
    path: 'profile', 
    component: ProfileComponent,
    canActivate: [authGuard]
  }
];
