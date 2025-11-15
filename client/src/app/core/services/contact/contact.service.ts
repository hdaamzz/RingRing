import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contact, SearchUserResult } from '../../interfaces/contact';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);

  searchUser(ringNumber: string): Observable<{ user: SearchUserResult }> {
    return this.http.get<{ user: SearchUserResult }>(
      `/api/contacts/search?ringNumber=${ringNumber}`,
      { withCredentials: true }
    );
  }

  getContacts(): Observable<{ contacts: Contact[] }> {
    return this.http.get<{ contacts: Contact[] }>(
      '/api/contacts',
      { withCredentials: true }
    );
  }

  addContact(ringNumber: string): Observable<{ message: string; contact: Contact }> {
    return this.http.post<{ message: string; contact: Contact }>(
      '/api/contacts',
      { ringNumber },
      { withCredentials: true }
    );
  }

  updateContact(contactId: string, data: Partial<Contact>): Observable<{ message: string; contact: Contact }> {
    return this.http.put<{ message: string; contact: Contact }>(
      `/api/contacts/${contactId}`,
      data,
      { withCredentials: true }
    );
  }

  deleteContact(contactId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `/api/contacts/${contactId}`,
      { withCredentials: true }
    );
  }

  toggleFavorite(contactId: string): Observable<{ message: string; contact: Contact }> {
    return this.http.patch<{ message: string; contact: Contact }>(
      `/api/contacts/${contactId}/favorite`,
      {},
      { withCredentials: true }
    );
  }

  blockContact(contactId: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `/api/contacts/${contactId}/block`,
      {},
      { withCredentials: true }
    );
  }
}