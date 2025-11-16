import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { IncomingCallComponent } from './components/incoming-call/incoming-call.component';
import { SocketService } from './core/services/socket/socket.service';
import { AuthService } from './core/services/auth/auth.service';
import { WebrtcService } from './core/services/webrtc/webrtc.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,ToastComponent,IncomingCallComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  private socketService = inject(SocketService);
  private authService = inject(AuthService);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      
      if (user && !this.socketService.isConnected()) {
        this.socketService.connect(user.email, user.name, user.picture);
      } else if (!user && this.socketService.isConnected()) {
        this.socketService.disconnect();
      }
    });
  }
  ngOnInit(): void {
   const user = this.authService.currentUser();
    if (user) {
      this.socketService.connect(user.email, user.name, user.picture);
    }
    
  }
  ngOnDestroy(): void {
    this.socketService.disconnect();
  }
}
