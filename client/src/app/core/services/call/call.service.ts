import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CallHistoryResponse } from '../../interfaces/call';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CallService {

  private http = inject(HttpClient);
  private api=environment.api_url

    getCallHistory(page: number = 1, limit: number = 20): Observable<CallHistoryResponse> {
      return this.http.get<CallHistoryResponse>(
        `${this.api}/api/calls/history?page=${page}&limit=${limit}`
      );
    }
}
