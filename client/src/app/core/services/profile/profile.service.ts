import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RingNumberResponse } from '../../interfaces/user';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
  

  assignRingNumber(): Observable<RingNumberResponse> {
    return this.http.post<RingNumberResponse>(
      '/api/ring-number/assign',
      {},
      { withCredentials: true }
    );
  }

  findUserByRingNumber(ringNumber: string): Observable<any> {
    return this.http.get(
      `/api/ring-number/user/${ringNumber}`,
      { withCredentials: true }
    );
  }
}
