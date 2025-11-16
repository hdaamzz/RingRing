import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CallHistoryResponse } from '../../interfaces/call';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CallService {

  private http = inject(HttpClient);

    getCallHistory(page: number = 1, limit: number = 20): Observable<CallHistoryResponse> {
      return this.http.get<CallHistoryResponse>(
        `/api/calls/history?page=${page}&limit=${limit}`,
        { withCredentials: true }
      );
    }
}
