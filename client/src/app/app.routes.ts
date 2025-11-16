import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authGuard } from './core/guard/auth/auth.guard';
import { ContactsComponent } from './components/contacts/contacts.component';
import { CallComponent } from './components/call/call.component';
import { CallHistoryComponent } from './components/call-history/call-history.component';

export const routes: Routes = [
    {
        path:'',
        component:LandingComponent
    },
    { 
      path: 'profile', 
      component: ProfileComponent,
      canActivate: [authGuard]
    },
    { 
      path: 'contacts', 
      component: ContactsComponent,
      canActivate: [authGuard]
    },
    { 
      path: 'call', 
      component: CallComponent,
      canActivate: [authGuard]
    },
    { 
      path: 'history', 
      component: CallHistoryComponent,
      canActivate: [authGuard] 
    },
];
