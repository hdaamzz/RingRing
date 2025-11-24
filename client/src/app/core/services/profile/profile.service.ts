import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RingNumberResponse } from '../../interfaces/user';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
private api=environment.api_url

  assignRingNumber(): Observable<RingNumberResponse> {
    return this.http.post<RingNumberResponse>(
      `${this.api}/api/ring-number/assign`,
      {}
    );
  }

  findUserByRingNumber(ringNumber: string): Observable<any> {
    return this.http.get(
      `${this.api}/api/ring-number/user/${ringNumber}`
    );
  }
}
